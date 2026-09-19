import { prisma } from "../lib/prisma";
import { emitAuctionEnded } from "../socket";
import { createNotification } from "../services/notifications";

/** Close a single live auction that has passed endsAt. Returns updated auction or null. */
export async function finalizeExpiredAuction(auctionId: string) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.status !== "live" || auction.endsAt > new Date()) {
    return null;
  }

  const topBid = await prisma.bid.findFirst({
    where: { auctionId: auction.id },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });

  const meetsReserve =
    !auction.reservePrice ||
    (topBid && Number(topBid.amount) >= Number(auction.reservePrice));

  const updated = await prisma.auction.update({
    where: { id: auction.id },
    data: {
      status: "ended",
      winnerId: meetsReserve && topBid ? topBid.bidderId : null,
    },
  });

  emitAuctionEnded(auction.id, {
    auctionId: auction.id,
    winnerId: updated.winnerId,
    finalBid: auction.currentBid,
  });

  if (updated.winnerId) {
    await createNotification(
      updated.winnerId,
      "won",
      `You won "${auction.title}" for ${auction.currentBid} BDT. Please complete payment.`,
      { auctionId: auction.id }
    );
  }

  await createNotification(
    auction.sellerId,
    "general",
    updated.winnerId
      ? `Your auction "${auction.title}" ended. Winner will proceed to payment.`
      : `Your auction "${auction.title}" ended with no successful sale.`,
    { auctionId: auction.id }
  );

  return updated;
}

export async function closeExpiredAuctions() {
  const now = new Date();
  const expired = await prisma.auction.findMany({
    where: { status: "live", endsAt: { lte: now } },
    select: { id: true },
  });

  for (const auction of expired) {
    await finalizeExpiredAuction(auction.id);
  }

  // Ending soon alerts (within 1 hour)
  const soon = await prisma.auction.findMany({
    where: {
      status: "live",
      endsAt: {
        gt: now,
        lte: new Date(now.getTime() + 60 * 60 * 1000),
      },
    },
    include: {
      watchlist: true,
      bids: { distinct: ["bidderId"], select: { bidderId: true } },
    },
  });

  for (const auction of soon) {
    const userIds = new Set<string>();
    auction.watchlist.forEach((w) => userIds.add(w.userId));
    auction.bids.forEach((b) => userIds.add(b.bidderId));
    for (const userId of userIds) {
      const recent = await prisma.notification.findFirst({
        where: {
          userId,
          type: "ending_soon",
          createdAt: { gt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
          message: { contains: auction.title },
        },
      });
      if (!recent) {
        await createNotification(
          userId,
          "ending_soon",
          `Auction "${auction.title}" ends within an hour.`,
          { auctionId: auction.id }
        );
      }
    }
  }

  return expired.length;
}

export function startAuctionEnder(intervalMs = 30_000) {
  const tick = async () => {
    try {
      await closeExpiredAuctions();
    } catch (err) {
      console.error("Auction ender error:", err);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}

import { prisma } from "../lib/prisma";
import { emitAuctionEnded } from "../socket";
import { createNotification } from "../services/notifications";
import { releaseDueEscrow } from "../lib/escrow";

/** Close a live auction. Expired lots close on their own; `force` lets the seller end early. */
export async function finalizeAuction(
  auctionId: string,
  options?: { force?: boolean }
) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.status !== "live") return null;
  if (!options?.force && auction.endsAt > new Date()) return null;

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
      endsAt: options?.force ? new Date() : auction.endsAt,
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
      `You won "${auction.title}" for ${auction.currentBid} BDT. Pay into escrow to claim it.`,
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

/** Close a single live auction that has passed endsAt. Returns updated auction or null. */
export async function finalizeExpiredAuction(auctionId: string) {
  return finalizeAuction(auctionId);
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
      await releaseDueEscrow();
    } catch (err) {
      console.error("Auction ender error:", err);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}

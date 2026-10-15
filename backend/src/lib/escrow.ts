import { Prisma, Transaction } from "@prisma/client";
import { prisma } from "./prisma";
import { getStripe } from "./stripe";
import { createNotification } from "../services/notifications";

export const ESCROW_HOLD_DAYS = 7;

export function releaseDueAtFrom(from: Date) {
  return new Date(from.getTime() + ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000);
}

const escrowSelect = {
  id: true,
  auctionId: true,
  buyerId: true,
  sellerId: true,
  amount: true,
  status: true,
  heldAt: true,
  releaseDueAt: true,
  shippedAt: true,
  releasedAt: true,
  disputeReason: true,
  disputedAt: true,
  resolvedAt: true,
  resolveNote: true,
} satisfies Prisma.TransactionSelect;

export type PublicEscrow = Prisma.TransactionGetPayload<{
  select: typeof escrowSelect;
}>;

function toPublicEscrow(txn: PublicEscrow): PublicEscrow {
  return txn;
}

async function loadEscrow(id: string) {
  const txn = await prisma.transaction.findUnique({
    where: { id },
    select: escrowSelect,
  });
  if (!txn) throw new Error("Escrow record not found");
  return txn;
}

async function auctionTitle(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { title: true },
  });
  return auction?.title || "this auction";
}

async function notifyParties(
  txn: { buyerId: string; sellerId: string; auctionId: string; id: string },
  buyerMessage: string,
  sellerMessage: string
) {
  await createNotification(txn.buyerId, "general", buyerMessage, {
    auctionId: txn.auctionId,
    transactionId: txn.id,
    kind: "escrow",
  });
  await createNotification(txn.sellerId, "general", sellerMessage, {
    auctionId: txn.auctionId,
    transactionId: txn.id,
    kind: "escrow",
  });
}

export async function placeInEscrow(input: {
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  stripeSessionId?: string | null;
  stripePaymentId?: string | null;
}) {
  const settled = await prisma.transaction.findFirst({
    where: {
      auctionId: input.auctionId,
      buyerId: input.buyerId,
      status: { in: ["held", "disputed", "completed"] },
    },
    select: escrowSelect,
  });
  if (settled) return toPublicEscrow(settled);

  const now = new Date();
  const releaseDueAt = releaseDueAtFrom(now);
  const auction = await prisma.auction.findUnique({
    where: { id: input.auctionId },
    select: { currentBid: true },
  });
  const amount = Number(auction?.currentBid || input.amount);
  const pending = input.stripeSessionId
    ? await prisma.transaction.findFirst({
        where: { stripeSessionId: input.stripeSessionId },
      })
    : null;

  let created = false;
  let txn: Transaction;
  if (pending) {
    if (pending.status === "held") {
      return loadEscrow(pending.id);
    }
    const updated = await prisma.transaction.updateMany({
      where: { id: pending.id, status: "pending" },
      data: {
        status: "held",
        stripePaymentId: input.stripePaymentId || pending.stripePaymentId,
        heldAt: now,
        releaseDueAt,
      },
    });
    created = updated.count > 0;
    txn = (await prisma.transaction.findUnique({ where: { id: pending.id } }))!;
  } else {
    txn = await prisma.transaction.create({
      data: {
        auctionId: input.auctionId,
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        amount,
        status: "held",
        stripeSessionId: input.stripeSessionId || undefined,
        stripePaymentId: input.stripePaymentId || undefined,
        heldAt: now,
        releaseDueAt,
      },
    });
    created = true;
  }

  const escrow = await loadEscrow(txn.id);
  if (created && escrow.status === "held") {
    const title = await auctionTitle(input.auctionId);
    await notifyParties(
      escrow,
      `Your payment for "${title}" is held in escrow. Confirm receipt after the item arrives, or open a dispute.`,
      `The buyer paid for "${title}". Funds stay in escrow until they confirm receipt.`
    );
  }
  return escrow;
}

export async function releaseToSeller(transactionId: string, note?: string) {
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new Error("Escrow record not found");
    if (txn.status !== "held" && txn.status !== "disputed") {
      throw new Error("Cannot release escrow that is not open");
    }
    const row = await tx.transaction.update({
      where: { id: txn.id },
      data: {
        status: "completed",
        releasedAt: now,
        resolvedAt: now,
        resolveNote: note?.trim() || txn.resolveNote,
      },
      select: escrowSelect,
    });
    await tx.auction.update({
      where: { id: txn.auctionId },
      data: { status: "sold" },
    });
    return row;
  });

  const title = await auctionTitle(updated.auctionId);
  const extra = note?.trim() ? ` ${note.trim()}` : "";
  await notifyParties(
    updated,
    `Escrow for "${title}" was released to the seller.${extra}`,
    `Escrow for "${title}" was released to your verified bank account.${extra}`
  );
  return updated;
}

export async function refundEscrow(transactionId: string, note?: string) {
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { auction: { select: { status: true, title: true } } },
  });
  if (!txn) throw new Error("Escrow record not found");
  if (!["held", "disputed", "completed"].includes(txn.status)) {
    throw new Error("Cannot refund this payment");
  }

  if (txn.stripePaymentId) {
    const stripe = getStripe();
    if (stripe) {
      await stripe.refunds.create({ payment_intent: txn.stripePaymentId });
    }
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.transaction.update({
      where: { id: txn.id },
      data: {
        status: "refunded",
        resolvedAt: now,
        resolveNote: note?.trim() || txn.resolveNote,
      },
      select: escrowSelect,
    });
    if (txn.auction.status === "sold") {
      await tx.auction.update({
        where: { id: txn.auctionId },
        data: { status: "ended" },
      });
    }
    return row;
  });

  const reason = note?.trim() ? ` ${note.trim()}` : "";
  await notifyParties(
    updated,
    `Your payment for "${txn.auction.title}" was refunded.${reason}`,
    `The payment for "${txn.auction.title}" was refunded to the buyer.${reason}`
  );
  return updated;
}

export async function markShipped(transactionId: string, sellerId: string) {
  const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!txn) throw new Error("Escrow record not found");
  if (txn.sellerId !== sellerId) {
    throw new Error("Only the seller can mark this item shipped");
  }
  if (txn.status !== "held") {
    throw new Error("Cannot mark a shipment on this payment");
  }
  if (txn.shippedAt) return loadEscrow(txn.id);

  const shippedAt = new Date();
  const updated = await prisma.transaction.update({
    where: { id: txn.id },
    data: {
      shippedAt,
      releaseDueAt: releaseDueAtFrom(shippedAt),
    },
    select: escrowSelect,
  });
  const title = await auctionTitle(txn.auctionId);
  await createNotification(
    txn.buyerId,
    "general",
    `The seller marked "${title}" as shipped. Confirm receipt to release escrow, or open a dispute. Funds release automatically ${ESCROW_HOLD_DAYS} days after shipment if you do nothing.`,
    { auctionId: txn.auctionId, transactionId: txn.id, kind: "escrow" }
  );
  return updated;
}

export async function confirmReceipt(transactionId: string, buyerId: string) {
  const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!txn) throw new Error("Escrow record not found");
  if (txn.buyerId !== buyerId) {
    throw new Error("Only the buyer can confirm receipt");
  }
  if (txn.status !== "held") {
    throw new Error("Cannot confirm receipt for this payment");
  }
  return releaseToSeller(txn.id, "Buyer confirmed receipt.");
}

export async function openDispute(
  transactionId: string,
  buyerId: string,
  reason: string
) {
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    throw new Error("A dispute reason is required");
  }
  const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!txn) throw new Error("Escrow record not found");
  if (txn.buyerId !== buyerId) {
    throw new Error("Only the buyer can open a dispute");
  }
  if (txn.status !== "held") {
    throw new Error("Cannot open a dispute on this payment");
  }

  const updated = await prisma.transaction.update({
    where: { id: txn.id },
    data: {
      status: "disputed",
      disputeReason: trimmed,
      disputedAt: new Date(),
    },
    select: escrowSelect,
  });
  const title = await auctionTitle(txn.auctionId);
  await createNotification(
    txn.sellerId,
    "general",
    `The buyer opened a dispute on "${title}": ${trimmed}`,
    { auctionId: txn.auctionId, transactionId: txn.id, kind: "escrow" }
  );
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  for (const admin of admins) {
    await createNotification(
      admin.id,
      "general",
      `Escrow dispute on "${title}": ${trimmed}`,
      { auctionId: txn.auctionId, transactionId: txn.id, kind: "escrow" }
    );
  }
  return updated;
}

export async function releaseDueEscrow() {
  const due = await prisma.transaction.findMany({
    where: {
      status: "held",
      shippedAt: { not: null },
      releaseDueAt: { lte: new Date() },
    },
    select: { id: true },
  });
  let released = 0;
  for (const row of due) {
    try {
      await releaseToSeller(row.id, "Released automatically after the hold period.");
      released += 1;
    } catch (err) {
      console.error("Escrow auto-release failed", row.id, err);
    }
  }
  return released;
}

export async function latestEscrowForAuction(auctionId: string) {
  return prisma.transaction.findFirst({
    where: { auctionId, status: { not: "failed" } },
    orderBy: { createdAt: "desc" },
    select: escrowSelect,
  });
}

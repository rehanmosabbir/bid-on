import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";
import { param } from "../lib/params";
import { emitBidUpdate } from "../socket";
import { createNotification } from "../services/notifications";

const router = Router({ mergeParams: true });

router.post(
  "/",
  requireAuth,
  requirePermission("bid:place"),
  asyncHandler(async (req, res) => {
    const amount = z.coerce.number().positive().parse(req.body.amount);
    const auctionId = param(req, "id") || param(req, "auctionId");
    const bidderId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction) throw new Error("Auction not found");
      if (auction.status !== "live") throw new Error("Auction is not live");
      if (auction.endsAt <= new Date()) throw new Error("Auction has ended");
      if (auction.sellerId === bidderId) throw new Error("Cannot bid on your own auction");

      const minBid =
        Number(auction.currentBid) > 0
          ? Number(auction.currentBid) + 1
          : Number(auction.startPrice);

      if (amount < minBid) {
        throw new Error(`Bid must be at least ${minBid} BDT`);
      }
      if (auction.maxPriceCap && amount > Number(auction.maxPriceCap)) {
        throw new Error(`Bid exceeds max price cap of ${auction.maxPriceCap} BDT`);
      }

      const previousTop = await tx.bid.findFirst({
        where: { auctionId },
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      });

      const bid = await tx.bid.create({
        data: {
          auctionId,
          bidderId,
          amount: new Prisma.Decimal(amount),
        },
        include: { bidder: { select: { id: true, name: true } } },
      });

      const updated = await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentBid: amount,
          bidCount: { increment: 1 },
        },
      });

      return { bid, auction: updated, previousTop };
    });

    emitBidUpdate(auctionId, {
      bid: result.bid,
      currentBid: result.auction.currentBid,
      bidCount: result.auction.bidCount,
    });

    if (result.previousTop && result.previousTop.bidderId !== bidderId) {
      await createNotification(
        result.previousTop.bidderId,
        "outbid",
        `You were outbid on an auction. New bid: ${amount} BDT`,
        { auctionId, amount }
      );
    }

    res.status(201).json({ bid: result.bid, auction: result.auction });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const auctionId = param(req, "id") || param(req, "auctionId");
    const bids = await prisma.bid.findMany({
      where: { auctionId },
      include: { bidder: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ bids });
  })
);

export default router;

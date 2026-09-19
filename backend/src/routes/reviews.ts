import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      auctionId: z.string(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
    });
    const data = schema.parse(req.body);

    const auction = await prisma.auction.findUnique({ where: { id: data.auctionId } });
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (!["ended", "sold"].includes(auction.status)) {
      return res.status(400).json({ error: "Auction not completed" });
    }
    if (auction.winnerId !== req.user!.id && auction.sellerId !== req.user!.id) {
      return res.status(403).json({ error: "Only participants can review" });
    }

    const toUserId =
      req.user!.id === auction.winnerId ? auction.sellerId : auction.winnerId!;
    if (!toUserId) return res.status(400).json({ error: "No counterpart to review" });

    const review = await prisma.review.create({
      data: {
        auctionId: data.auctionId,
        fromUserId: req.user!.id,
        toUserId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    const agg = await prisma.review.aggregate({
      where: { toUserId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.user.update({
      where: { id: toUserId },
      data: {
        ratingAvg: agg._avg.rating || 0,
        ratingCount: agg._count.rating,
      },
    });

    res.status(201).json({ review });
  })
);

export default router;

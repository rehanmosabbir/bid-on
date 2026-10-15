import { NextFunction, Request, Response, Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, optionalAuth } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";
import { createNotification } from "../services/notifications";
import { param } from "../lib/params";
import { finalizeAuction, finalizeExpiredAuction } from "../jobs/auctionEnder";
import { imageUpload } from "../lib/upload";
import { assertReadyToTransact } from "../lib/compliance";
import { latestEscrowForAuction } from "../lib/escrow";

const router = Router();

function maybeImages(req: Request, res: Response, next: NextFunction) {
  const type = req.headers["content-type"] || "";
  if (type.includes("multipart/form-data")) {
    return imageUpload.array("images", 8)(req, res, next);
  }
  next();
}

function asStringArray(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)].filter(Boolean);
}

function auctionInclude() {
  return {
    category: true,
    seller: { select: { id: true, name: true, ratingAvg: true, ratingCount: true } },
    winner: { select: { id: true, name: true } },
    bids: {
      orderBy: { createdAt: "desc" as const },
      take: 20,
      include: { bidder: { select: { id: true, name: true } } },
    },
    _count: { select: { bids: true, watchlist: true } },
  };
}

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || "live";
    const category = req.query.category as string | undefined;
    const q = req.query.q as string | undefined;
    const min = req.query.min ? Number(req.query.min) : undefined;
    const max = req.query.max ? Number(req.query.max) : undefined;

    const where: Prisma.AuctionWhereInput = {};
    if (status !== "all") where.status = status as Prisma.EnumAuctionStatusFilter["equals"];
    if (category) where.category = { slug: category };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    if (min !== undefined || max !== undefined) {
      where.currentBid = {};
      if (min !== undefined) where.currentBid.gte = min;
      if (max !== undefined) where.currentBid.lte = max;
    }

    const auctions = await prisma.auction.findMany({
      where,
      include: {
        category: true,
        seller: { select: { id: true, name: true, ratingAvg: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { endsAt: "asc" },
    });
    res.json({ auctions });
  })
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    // Close immediately if the countdown has elapsed (don't wait for the job)
    await finalizeExpiredAuction(param(req, "id"));

    const auction = await prisma.auction.findUnique({
      where: { id: param(req, "id") },
      include: auctionInclude(),
    });
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    let watching = false;
    let escrow = null;
    if (req.user) {
      const w = await prisma.watchlist.findUnique({
        where: {
          userId_auctionId: { userId: req.user.id, auctionId: auction.id },
        },
      });
      watching = Boolean(w);
      const party =
        req.user.role === "admin" ||
        req.user.id === auction.winnerId ||
        req.user.id === auction.sellerId;
      if (party) {
        escrow = await latestEscrowForAuction(auction.id);
      }
    }
    res.json({ auction, watching, escrow });
  })
);

router.post(
  "/",
  requireAuth,
  requirePermission("listing:create"),
  imageUpload.array("images", 8),
  asyncHandler(async (req, res) => {
    await assertReadyToTransact(req.user!.id, "sell");

    const schema = z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      categoryId: z.string(),
      startPrice: z.coerce.number().positive(),
      reservePrice: z.coerce.number().positive().optional(),
      maxPriceCap: z.coerce.number().positive().optional(),
      minBidIncrement: z.coerce.number().positive().default(1),
      durationMinutes: z.coerce.number().min(1).max(43200).default(4320),
    });
    const data = schema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];
    const images = files.map((f) => `/uploads/${f.filename}`);
    if (req.body.imageUrl) images.push(String(req.body.imageUrl));
    if (images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const endsAt = new Date(Date.now() + data.durationMinutes * 60 * 1000);
    const auction = await prisma.auction.create({
      data: {
        sellerId: req.user!.id,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        images,
        startPrice: data.startPrice,
        reservePrice: data.reservePrice,
        maxPriceCap: data.maxPriceCap,
        minBidIncrement: data.minBidIncrement,
        currentBid: 0,
        status: "pending",
        endsAt,
      },
      include: { category: true },
    });

    res.status(201).json({ auction, message: "Listing submitted for admin approval" });
  })
);

const optionalMoney = z.union([z.coerce.number().positive(), z.literal("")]).optional();

router.patch(
  "/:id",
  requireAuth,
  requirePermission("listing:create"),
  maybeImages,
  asyncHandler(async (req, res) => {
    const auction = await prisma.auction.findUnique({
      where: { id: param(req, "id") },
      include: { _count: { select: { bids: true } } },
    });
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (auction.sellerId !== req.user!.id && req.user!.role !== "admin") {
      return res.status(403).json({ error: "You can only edit your own listings" });
    }
    if (!["pending", "live"].includes(auction.status)) {
      return res.status(400).json({
        error: "Only pending or live listings can be edited",
      });
    }

    const noBids = auction._count.bids === 0 && Number(auction.currentBid) === 0;
    if (auction.status === "live" && !noBids) {
      return res.status(400).json({
        error: "Cannot change price or duration after bids have been placed",
      });
    }

    const update: Prisma.AuctionUpdateInput = {};

    if (auction.status === "pending") {
      const schema = z.object({
        title: z.string().min(3).optional(),
        description: z.string().min(10).optional(),
        categoryId: z.string().min(1).optional(),
        startPrice: z.coerce.number().positive().optional(),
        reservePrice: optionalMoney,
        maxPriceCap: optionalMoney,
        minBidIncrement: z.coerce.number().positive().optional(),
        durationMinutes: z.coerce.number().min(1).max(43200).optional(),
      });
      const data = schema.parse(req.body);
      if (data.title !== undefined) update.title = data.title;
      if (data.description !== undefined) update.description = data.description;
      if (data.categoryId !== undefined) {
        update.category = { connect: { id: data.categoryId } };
      }
      if (data.startPrice !== undefined) update.startPrice = data.startPrice;
      if (data.reservePrice === "") update.reservePrice = null;
      else if (data.reservePrice !== undefined) update.reservePrice = data.reservePrice;
      if (data.maxPriceCap === "") update.maxPriceCap = null;
      else if (data.maxPriceCap !== undefined) update.maxPriceCap = data.maxPriceCap;
      if (data.minBidIncrement !== undefined) update.minBidIncrement = data.minBidIncrement;
      if (data.durationMinutes !== undefined) {
        update.endsAt = new Date(Date.now() + data.durationMinutes * 60 * 1000);
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const uploaded = files.map((f) => `/uploads/${f.filename}`);
      if (req.body.imageUrl) uploaded.push(String(req.body.imageUrl));
      if (uploaded.length > 0 || req.body.existingImages !== undefined) {
        const images = [...asStringArray(req.body.existingImages), ...uploaded];
        if (images.length === 0) {
          return res.status(400).json({ error: "At least one image is required" });
        }
        update.images = images;
      }
    } else {
      const schema = z.object({
        startPrice: z.coerce.number().positive().optional(),
        minBidIncrement: z.coerce.number().positive().optional(),
        durationMinutes: z.coerce.number().min(1).max(43200).optional(),
      });
      const data = schema.parse(req.body);
      if (
        data.startPrice === undefined &&
        data.durationMinutes === undefined &&
        data.minBidIncrement === undefined
      ) {
        return res.status(400).json({ error: "Nothing to update" });
      }
      if (data.startPrice !== undefined) update.startPrice = data.startPrice;
      if (data.minBidIncrement !== undefined) update.minBidIncrement = data.minBidIncrement;
      if (data.durationMinutes !== undefined) {
        update.endsAt = new Date(Date.now() + data.durationMinutes * 60 * 1000);
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: update,
      include: auctionInclude(),
    });

    res.json({ auction: updated, message: "Listing updated" });
  })
);

router.post(
  "/:id/close",
  requireAuth,
  requirePermission("listing:create"),
  asyncHandler(async (req, res) => {
    const auction = await prisma.auction.findUnique({
      where: { id: param(req, "id") },
    });
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (auction.sellerId !== req.user!.id && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Only the seller can close this auction" });
    }
    if (auction.status !== "live") {
      return res.status(400).json({ error: "Only live auctions can be closed early" });
    }

    const updated = await finalizeAuction(auction.id, { force: true });
    if (!updated) {
      return res.status(400).json({ error: "Auction could not be closed" });
    }
    res.json({ auction: updated, message: "Auction closed" });
  })
);

router.post(
  "/:id/approve",
  requireAuth,
  requirePermission("listing:approve"),
  asyncHandler(async (req, res) => {
    const auction = await prisma.auction.findUnique({ where: { id: param(req, "id") } });
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (auction.status !== "pending") {
      return res.status(400).json({ error: "Only pending auctions can be approved" });
    }

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        status: "live",
        startsAt: new Date(),
        endsAt:
          auction.endsAt < new Date()
            ? new Date(Date.now() + 72 * 60 * 60 * 1000)
            : auction.endsAt,
      },
    });

    await createNotification(
      auction.sellerId,
      "approved",
      `Your auction "${auction.title}" is now live.`
    );

    res.json({ auction: updated });
  })
);

router.post(
  "/:id/reject",
  requireAuth,
  requirePermission("listing:approve"),
  asyncHandler(async (req, res) => {
    const reason = z.string().min(3).parse(req.body.reason || "Does not meet guidelines");
    const auction = await prisma.auction.findUnique({ where: { id: param(req, "id") } });
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: { status: "cancelled", rejectReason: reason },
    });

    await createNotification(
      auction.sellerId,
      "rejected",
      `Your auction "${auction.title}" was rejected: ${reason}`
    );

    res.json({ auction: updated });
  })
);

export default router;

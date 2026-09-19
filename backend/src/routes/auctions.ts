import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, optionalAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createNotification } from "../services/notifications";
import { param } from "../lib/params";

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

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
    const auction = await prisma.auction.findUnique({
      where: { id: param(req, "id") },
      include: auctionInclude(),
    });
    if (!auction) return res.status(404).json({ error: "Auction not found" });

    let watching = false;
    if (req.user) {
      const w = await prisma.watchlist.findUnique({
        where: {
          userId_auctionId: { userId: req.user.id, auctionId: auction.id },
        },
      });
      watching = Boolean(w);
    }
    res.json({ auction, watching });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("seller", "admin"),
  upload.array("images", 5),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      categoryId: z.string(),
      startPrice: z.coerce.number().positive(),
      reservePrice: z.coerce.number().positive().optional(),
      maxPriceCap: z.coerce.number().positive().optional(),
      durationHours: z.coerce.number().min(1).max(720).default(72),
    });
    const data = schema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];
    const images = files.map((f) => `/uploads/${f.filename}`);
    if (images.length === 0 && req.body.imageUrl) {
      images.push(String(req.body.imageUrl));
    }
    if (images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const endsAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);
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
        currentBid: 0,
        status: "pending",
        endsAt,
      },
      include: { category: true },
    });

    res.status(201).json({ auction, message: "Listing submitted for admin approval" });
  })
);

router.post(
  "/:id/approve",
  requireAuth,
  requireRole("admin"),
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
  requireRole("admin"),
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

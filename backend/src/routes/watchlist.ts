import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";
import { param } from "../lib/params";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission("watchlist:manage"),
  asyncHandler(async (req, res) => {
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user!.id },
      include: {
        auction: {
          include: {
            category: true,
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ watchlist: items });
  })
);

router.post(
  "/:auctionId",
  requireAuth,
  requirePermission("watchlist:manage"),
  asyncHandler(async (req, res) => {
    const auctionId = param(req, "auctionId");
    const item = await prisma.watchlist.upsert({
      where: {
        userId_auctionId: {
          userId: req.user!.id,
          auctionId,
        },
      },
      create: { userId: req.user!.id, auctionId },
      update: {},
    });
    res.status(201).json({ item });
  })
);

router.delete(
  "/:auctionId",
  requireAuth,
  requirePermission("watchlist:manage"),
  asyncHandler(async (req, res) => {
    await prisma.watchlist.deleteMany({
      where: { userId: req.user!.id, auctionId: param(req, "auctionId") },
    });
    res.json({ message: "Removed from watchlist" });
  })
);

export default router;

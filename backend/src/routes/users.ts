import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../lib/auth";
import { hasPermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      role: z.enum(["buyer", "seller"]).optional(),
    });
    const data = schema.parse(req.body);

    const current = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { role: true },
    });
    if (!current) {
      return res.status(404).json({ error: "User not found" });
    }

    if (data.role !== undefined) {
      if (current.role === "admin") {
        return res
          .status(403)
          .json({ error: "Admin role cannot be changed from account settings" });
      }
      if (!hasPermission(current.role, "account:switch_role")) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        ratingAvg: true,
        verified: true,
      },
    });

    const roleChanged = data.role !== undefined && data.role !== current.role;
    if (roleChanged) {
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res.json({ user, token });
    }

    res.json({ user });
  })
);

router.get(
  "/me/bids",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bids = await prisma.bid.findMany({
      where: { bidderId: req.user!.id },
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
    res.json({ bids });
  })
);

router.get(
  "/me/listings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auctions = await prisma.auction.findMany({
      where: { sellerId: req.user!.id },
      include: { category: true, _count: { select: { bids: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ auctions });
  })
);

router.get(
  "/me/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }],
      },
      include: {
        auction: { select: { id: true, title: true, images: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ transactions });
  })
);

export default router;

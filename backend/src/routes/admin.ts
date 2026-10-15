import { Router } from "express";
import { Prisma, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";
import { param } from "../lib/params";
import { createNotification } from "../services/notifications";
import { refundEscrow, releaseToSeller } from "../lib/escrow";

const router = Router();

router.use(requireAuth, requirePermission("admin:access"));

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [
      users,
      auctions,
      live,
      pending,
      bids,
      revenue,
      escrowHeld,
      recentAuctions,
      bidsByDay,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.auction.count(),
      prisma.auction.count({ where: { status: "live" } }),
      prisma.auction.count({ where: { status: "pending" } }),
      prisma.bid.count(),
      prisma.transaction.aggregate({
        where: { status: "completed" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { status: { in: ["held", "disputed"] } },
        _sum: { amount: true },
      }),
      prisma.auction.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { seller: { select: { name: true } }, category: true },
      }),
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', "createdAt") as day, COUNT(*)::bigint as count
        FROM "Bid"
        WHERE "createdAt" > NOW() - INTERVAL '14 days'
        GROUP BY 1
        ORDER BY 1
      `.catch(() => [] as { day: Date; count: bigint }[]),
    ]);

    res.json({
      stats: {
        users,
        auctions,
        live,
        pending,
        bids,
        revenue: Number(revenue._sum.amount || 0),
        escrowHeld: Number(escrowHeld._sum.amount || 0),
      },
      recentAuctions,
      bidsByDay: bidsByDay.map((r) => ({
        day: r.day,
        count: Number(r.count),
      })),
    });
  })
);

const verificationSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  verified: true,
  suspended: true,
  ratingAvg: true,
  createdAt: true,
  kycStatus: true,
  kycFullName: true,
  kycDocumentType: true,
  kycDocumentNumber: true,
  kycDocumentUrl: true,
  kycSubmittedAt: true,
  kycReviewedAt: true,
  kycRejectReason: true,
  bankStatus: true,
  bankAccountName: true,
  bankName: true,
  bankAccountNumber: true,
  bankBranch: true,
  bankRoutingNumber: true,
  bankSubmittedAt: true,
  bankReviewedAt: true,
  bankRejectReason: true,
  _count: { select: { auctions: true, bids: true } },
} satisfies Prisma.UserSelect;

function verificationStatus(value: unknown): VerificationStatus | undefined {
  if (value === "none" || value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return undefined;
}

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const where: Prisma.UserWhereInput = {};
    if (role && role !== "all" && ["buyer", "seller", "admin"].includes(role)) {
      where.role = role as Prisma.UserWhereInput["role"];
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: verificationSelect,
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  })
);

router.patch(
  "/users/:id/suspend",
  asyncHandler(async (req, res) => {
    const suspended = Boolean(req.body.suspended);
    const user = await prisma.user.update({
      where: { id: param(req, "id") },
      data: { suspended },
      select: { id: true, email: true, suspended: true },
    });
    res.json({ user });
  })
);

router.get(
  "/auctions",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const where: Prisma.AuctionWhereInput = {};
    if (status && status !== "all") {
      where.status = status as Prisma.AuctionWhereInput["status"];
    }
    if (sellerId) where.sellerId = sellerId;
    if (categoryId) where.categoryId = categoryId;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { seller: { name: { contains: q, mode: "insensitive" } } },
        { seller: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const auctions = await prisma.auction.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true, email: true } },
        category: true,
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ auctions });
  })
);

router.get(
  "/verifications",
  asyncHandler(async (req, res) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const queue = req.query.queue === "pending";
    const kycStatus = verificationStatus(req.query.kycStatus);
    const bankStatus = verificationStatus(req.query.bankStatus);

    const where: Prisma.UserWhereInput = {};
    if (role && role !== "all" && ["buyer", "seller"].includes(role)) {
      where.role = role as Prisma.UserWhereInput["role"];
    } else {
      where.role = { in: ["buyer", "seller"] };
    }

    const and: Prisma.UserWhereInput[] = [];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (queue) {
      and.push({ OR: [{ kycStatus: "pending" }, { bankStatus: "pending" }] });
    }
    if (kycStatus) and.push({ kycStatus });
    if (bankStatus) and.push({ bankStatus });
    if (and.length) where.AND = and;

    const users = await prisma.user.findMany({
      where,
      select: verificationSelect,
      orderBy: { updatedAt: "desc" },
    });
    res.json({ users });
  })
);

router.post(
  "/users/:id/kyc",
  asyncHandler(async (req, res) => {
    const decision = z.enum(["approved", "rejected"]).parse(req.body.decision);
    const reason = z.string().optional().parse(req.body.reason);
    const user = await prisma.user.findUnique({ where: { id: param(req, "id") } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.kycStatus !== "pending") {
      return res.status(400).json({ error: "Only pending KYC submissions can be reviewed" });
    }
    if (decision === "rejected" && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: "A rejection reason is required" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: decision,
        kycReviewedAt: new Date(),
        kycRejectReason: decision === "rejected" ? reason!.trim() : null,
      },
      select: verificationSelect,
    });

    await createNotification(
      user.id,
      "general",
      decision === "approved"
        ? "Your identity verification was approved."
        : `Your identity verification was rejected: ${reason!.trim()}`,
      { kind: "kyc", decision }
    );

    res.json({ user: updated });
  })
);

router.post(
  "/users/:id/bank",
  asyncHandler(async (req, res) => {
    const decision = z.enum(["approved", "rejected"]).parse(req.body.decision);
    const reason = z.string().optional().parse(req.body.reason);
    const user = await prisma.user.findUnique({ where: { id: param(req, "id") } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.bankStatus !== "pending") {
      return res.status(400).json({ error: "Only pending bank details can be reviewed" });
    }
    if (decision === "rejected" && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: "A rejection reason is required" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        bankStatus: decision,
        bankReviewedAt: new Date(),
        bankRejectReason: decision === "rejected" ? reason!.trim() : null,
      },
      select: verificationSelect,
    });

    await createNotification(
      user.id,
      "general",
      decision === "approved"
        ? "Your bank details were approved."
        : `Your bank details were rejected: ${reason!.trim()}`,
      { kind: "bank", decision }
    );

    res.json({ user: updated });
  })
);

router.get(
  "/escrow",
  asyncHandler(async (req, res) => {
    const raw = String(req.query.status || "open");
    const known = ["pending", "held", "disputed", "completed", "failed", "refunded"];
    const where =
      raw === "open"
        ? { status: { in: ["held" as const, "disputed" as const] } }
        : known.includes(raw)
          ? { status: raw as "held" }
          : {};
    const escrows = await prisma.transaction.findMany({
      where,
      include: {
        auction: { select: { id: true, title: true, status: true } },
        buyer: { select: { id: true, name: true, email: true } },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            bankStatus: true,
            bankName: true,
            bankAccountName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json({ escrows });
  })
);

router.post(
  "/escrow/:id/resolve",
  asyncHandler(async (req, res) => {
    const decision = z.enum(["release", "refund"]).parse(req.body.decision);
    const note = z.string().optional().parse(req.body.note);
    if (decision === "refund" && (!note || note.trim().length < 3)) {
      return res.status(400).json({ error: "A resolution note is required" });
    }
    const escrow =
      decision === "release"
        ? await releaseToSeller(param(req, "id"), note || "Released by admin.")
        : await refundEscrow(param(req, "id"), note);
    res.json({ escrow });
  })
);

router.get(
  "/reports/csv",
  asyncHandler(async (_req, res) => {
    const auctions = await prisma.auction.findMany({
      include: { seller: true, category: true },
      orderBy: { createdAt: "desc" },
    });
    const header = "id,title,status,seller,category,startPrice,currentBid,bidCount,endsAt\n";
    const rows = auctions
      .map((a) =>
        [
          a.id,
          JSON.stringify(a.title),
          a.status,
          JSON.stringify(a.seller.email),
          a.category.slug,
          a.startPrice,
          a.currentBid,
          a.bidCount,
          a.endsAt.toISOString(),
        ].join(",")
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=auctions-report.csv");
    res.send(header + rows);
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { param } from "../lib/params";

const router = Router();

router.use(requireAuth, requireRole("admin"));

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
      },
      recentAuctions,
      bidsByDay: bidsByDay.map((r) => ({
        day: r.day,
        count: Number(r.count),
      })),
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        suspended: true,
        ratingAvg: true,
        createdAt: true,
        _count: { select: { auctions: true, bids: true } },
      },
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
    const status = req.query.status as string | undefined;
    const auctions = await prisma.auction.findMany({
      where: status ? { status: status as never } : undefined,
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

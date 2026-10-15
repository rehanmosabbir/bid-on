import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [categories, liveGroups] = await Promise.all([
      prisma.category.findMany({
        include: { children: true, _count: { select: { auctions: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.auction.groupBy({
        by: ["categoryId"],
        where: { status: "live" },
        _count: { _all: true },
      }),
    ]);
    const liveByCategory = new Map(
      liveGroups.map((group) => [group.categoryId, group._count._all])
    );
    res.json({
      categories: categories.map((category) => ({
        ...category,
        liveCount: liveByCategory.get(category.id) ?? 0,
      })),
    });
  })
);

router.post(
  "/",
  requireAuth,
  requirePermission("category:create"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().min(2),
      parentId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json({ category });
  })
);

export default router;

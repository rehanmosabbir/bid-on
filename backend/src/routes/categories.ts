import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      include: { children: true, _count: { select: { auctions: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
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

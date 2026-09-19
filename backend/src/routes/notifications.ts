import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { param } from "../lib/params";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unread = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ notifications, unread });
  })
);

router.patch(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ message: "All marked read" });
  })
);

router.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const n = await prisma.notification.updateMany({
      where: { id: param(req, "id"), userId: req.user!.id },
      data: { read: true },
    });
    res.json({ updated: n.count });
  })
);

export default router;

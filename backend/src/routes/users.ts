import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authCookieOptions, requireAuth, signToken } from "../lib/auth";
import { hasPermission } from "../lib/permissions";
import { asyncHandler } from "../lib/asyncHandler";
import { publicUserSelect, toPublicUser } from "../lib/publicUser";
import { imageUpload } from "../lib/upload";

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
      select: publicUserSelect,
    });

    const roleChanged = data.role !== undefined && data.role !== current.role;
    if (roleChanged) {
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });
      res.cookie("token", token, authCookieOptions());
      return res.json({ user: toPublicUser(user), token });
    }

    res.json({ user: toPublicUser(user) });
  })
);

function kycPayload(user: {
  kycStatus: string;
  kycFullName: string | null;
  kycDocumentType: string | null;
  kycDocumentNumber: string | null;
  kycDocumentUrl: string | null;
  kycSubmittedAt: Date | null;
  kycReviewedAt: Date | null;
  kycRejectReason: string | null;
}) {
  return {
    status: user.kycStatus,
    fullName: user.kycFullName,
    documentType: user.kycDocumentType,
    documentNumber: user.kycDocumentNumber,
    documentUrl: user.kycDocumentUrl,
    submittedAt: user.kycSubmittedAt,
    reviewedAt: user.kycReviewedAt,
    rejectReason: user.kycRejectReason,
  };
}

function bankPayload(user: {
  bankStatus: string;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  bankRoutingNumber: string | null;
  bankSubmittedAt: Date | null;
  bankReviewedAt: Date | null;
  bankRejectReason: string | null;
}) {
  return {
    status: user.bankStatus,
    accountName: user.bankAccountName,
    bankName: user.bankName,
    accountNumber: user.bankAccountNumber,
    branch: user.bankBranch,
    routingNumber: user.bankRoutingNumber,
    submittedAt: user.bankSubmittedAt,
    reviewedAt: user.bankReviewedAt,
    rejectReason: user.bankRejectReason,
  };
}

router.get(
  "/me/kyc",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ kyc: kycPayload(user) });
  })
);

router.post(
  "/me/kyc",
  requireAuth,
  imageUpload.single("document"),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fullName: z.string().min(2),
      documentType: z.enum(["nid", "passport", "driving_license"]),
      documentNumber: z.string().min(4).max(40),
    });
    const data = schema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!existing) return res.status(404).json({ error: "User not found" });

    const documentUrl = req.file
      ? `/uploads/${req.file.filename}`
      : existing.kycDocumentUrl;
    if (!documentUrl) {
      return res.status(400).json({ error: "Identity document image is required" });
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        kycFullName: data.fullName.trim(),
        kycDocumentType: data.documentType,
        kycDocumentNumber: data.documentNumber.trim(),
        kycDocumentUrl: documentUrl,
        kycStatus: "pending",
        kycSubmittedAt: new Date(),
        kycReviewedAt: null,
        kycRejectReason: null,
      },
    });
    res.json({
      kyc: kycPayload(user),
      message: "KYC submitted for admin review",
    });
  })
);

router.get(
  "/me/bank",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ bank: bankPayload(user) });
  })
);

router.put(
  "/me/bank",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      accountName: z.string().min(2),
      bankName: z.string().min(2),
      accountNumber: z.string().min(6).max(34),
      branch: z.string().min(2),
      routingNumber: z.string().max(20).optional().or(z.literal("")),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        bankAccountName: data.accountName.trim(),
        bankName: data.bankName.trim(),
        bankAccountNumber: data.accountNumber.trim(),
        bankBranch: data.branch.trim(),
        bankRoutingNumber: data.routingNumber?.trim() || null,
        bankStatus: "pending",
        bankSubmittedAt: new Date(),
        bankReviewedAt: null,
        bankRejectReason: null,
      },
    });
    res.json({
      bank: bankPayload(user),
      message: "Bank details submitted for admin review",
    });
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

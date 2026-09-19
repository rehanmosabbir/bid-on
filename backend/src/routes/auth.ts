import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { otpEmailHtml, sendEmail } from "../lib/email";

const router = Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/[0-9]/, "Must include a number"),
  role: z.enum(["buyer", "seller"]).default("buyer"),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail(user.email, "Verify your Bid On account", otpEmailHtml(otp));

    res.status(201).json({
      message: "Registered. Check email for OTP.",
      email: user.email,
      // Dev convenience when SMTP is not configured
      ...(process.env.SMTP_HOST ? {} : { devOtp: otp }),
    });
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6),
    });
    const { email, otp } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, otpCode: null, otpExpiresAt: null },
    });

    const token = signToken({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.name,
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        verified: updated.verified,
      },
    });
  })
);

router.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const email = z.string().email().parse(req.body.email);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.verified) return res.json({ message: "Already verified" });

    const otp = generateOtp();
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await sendEmail(user.email, "Your Bid On OTP", otpEmailHtml(otp));
    res.json({
      message: "OTP resent",
      ...(process.env.SMTP_HOST ? {} : { devOtp: otp }),
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const { email, password } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.suspended) return res.status(403).json({ error: "Account suspended" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.verified) {
      return res.status(403).json({
        error: "Email not verified",
        needsVerification: true,
        email: user.email,
      });
    }

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
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        ratingAvg: user.ratingAvg,
      },
    });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        phone: true,
        address: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
      },
    });
    res.json({ user });
  })
);

export default router;

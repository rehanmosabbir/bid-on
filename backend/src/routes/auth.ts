import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { resetOtpEmailHtml, sendEmail, verifyEmailHtml } from "../lib/email";

const router = Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateVerifyToken() {
  return crypto.randomBytes(32).toString("hex");
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function buildVerifyUrl(token: string) {
  return `${frontendUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
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
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const verifyToken = generateVerifyToken();
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        otpCode: verifyToken,
        otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = buildVerifyUrl(verifyToken);
    const sent = await sendEmail(
      user.email,
      "Verify your Bid On account",
      verifyEmailHtml(verifyUrl)
    );

    res.status(201).json({
      message: sent.delivered
        ? "Registered. Check your email for a verification link."
        : "Registered. Check the API console for the verification link (email could not be sent).",
      email: user.email,
      ...(!sent.delivered ? { verifyUrl } : {}),
    });
  })
);

router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      token: z.string().min(32),
    });
    const { token } = schema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { otpCode: token },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification link" });
    }
    if (user.verified) {
      return res.status(400).json({ error: "Email already verified" });
    }
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: "Verification link expired" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, otpCode: null, otpExpiresAt: null },
    });

    const jwt = signToken({
      id: updated.id,
      email: updated.email,
      role: updated.role,
      name: updated.name,
    });

    res.cookie("token", jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: jwt,
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
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.verified) return res.json({ message: "Already verified" });

    const verifyToken = generateVerifyToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: verifyToken,
        otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const verifyUrl = buildVerifyUrl(verifyToken);
    const sent = await sendEmail(
      user.email,
      "Verify your Bid On account",
      verifyEmailHtml(verifyUrl)
    );
    res.json({
      message: sent.delivered
        ? "Verification email resent"
        : "Verification link generated — check the API console (email could not be sent).",
      ...(!sent.delivered ? { verifyUrl } : {}),
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

const passwordRules = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Must include uppercase")
  .regex(/[0-9]/, "Must include a number");

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const email = z.string().email().parse(req.body.email).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    let devOtp: string | undefined;
    if (user) {
      const otp = generateOtp();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetOtpCode: otp,
          resetOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      const sent = await sendEmail(
        user.email,
        "Reset your Bid On password",
        resetOtpEmailHtml(otp)
      );
      if (!sent.delivered) devOtp = otp;
    }

    res.json({
      message:
        "If an account exists for that email, a reset code has been sent.",
      email,
      ...(devOtp ? { devOtp } : {}),
    });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6),
      password: passwordRules,
    });
    const { email, otp, password } = schema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.resetOtpCode || user.resetOtpCode !== otp) {
      return res.status(400).json({ error: "Invalid or expired reset code" });
    }
    if (user.resetOtpExpiresAt && user.resetOtpExpiresAt < new Date()) {
      return res.status(400).json({ error: "Reset code expired" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtpCode: null,
        resetOtpExpiresAt: null,
      },
    });

    res.json({ message: "Password updated. You can log in now." });
  })
);

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

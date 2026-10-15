import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { getFrontendOrigin } from "../lib/corsOrigins";
import { getCurrency, getStripe } from "../lib/stripe";
import {
  confirmReceipt,
  markShipped,
  openDispute,
  placeInEscrow,
} from "../lib/escrow";
import { param } from "../lib/params";

const router = Router();

router.post(
  "/create-checkout-session",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auctionId = String(req.body.auctionId || "");
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { seller: true },
    });
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (auction.winnerId !== req.user!.id) {
      return res.status(403).json({ error: "Only the winner can pay" });
    }
    if (!["ended", "sold"].includes(auction.status)) {
      return res.status(400).json({ error: "Auction not ready for payment" });
    }

    const amount = Number(auction.currentBid);
    const existing = await prisma.transaction.findFirst({
      where: {
        auctionId,
        buyerId: req.user!.id,
        status: { in: ["held", "disputed", "completed"] },
      },
    });
    if (existing?.status === "completed") {
      return res.status(400).json({ error: "Already paid" });
    }
    if (existing) {
      return res.status(400).json({
        error: "Cannot pay again while this sale is in escrow",
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      const txn = await placeInEscrow({
        auctionId,
        buyerId: req.user!.id,
        sellerId: auction.sellerId,
        amount,
        stripeSessionId: `dev_${Date.now()}`,
      });
      return res.json({
        mode: "dev",
        message: "Payment held in escrow (no Stripe key configured)",
        transaction: txn,
        url: `${getFrontendOrigin()}/checkout/${auctionId}?success=1`,
      });
    }

    // Reuse an open Checkout Session if one already exists
    const pending = await prisma.transaction.findFirst({
      where: {
        auctionId,
        buyerId: req.user!.id,
        status: "pending",
        stripeSessionId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });
    if (pending?.stripeSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          pending.stripeSessionId
        );
        if (existingSession.status === "open" && existingSession.url) {
          return res.json({
            url: existingSession.url,
            sessionId: existingSession.id,
            mode: "stripe",
          });
        }
      } catch {
        /* create a new session below */
      }
    }

    const currency = getCurrency();
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: req.user!.email,
        success_url: `${getFrontendOrigin()}/checkout/${auctionId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getFrontendOrigin()}/checkout/${auctionId}?canceled=1`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: auction.title,
                description: "Won auction payment held in escrow — Bid On",
              },
            },
          },
        ],
        metadata: {
          auctionId,
          buyerId: req.user!.id,
          sellerId: auction.sellerId,
        },
      });
    } catch (err) {
      console.error("Stripe checkout failed", err);
      return res.status(502).json({
        error: "Cannot start Stripe checkout. Check the API key.",
      });
    }

    await prisma.transaction.create({
      data: {
        auctionId,
        buyerId: req.user!.id,
        sellerId: auction.sellerId,
        amount,
        stripeSessionId: session.id,
        status: "pending",
      },
    });

    res.json({ url: session.url, sessionId: session.id, mode: "stripe" });
  })
);

/** Confirm Checkout Session status after return from Stripe (sandbox-friendly). */
router.get(
  "/session-status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = String(req.query.session_id || "");
    if (!sessionId) {
      return res.status(400).json({ error: "session_id required" });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.json({ status: "complete", mode: "dev" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.buyerId && session.metadata.buyerId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Fulfill if webhook hasn't landed yet (common in local sandbox)
    if (
      session.status === "complete" &&
      session.payment_status === "paid" &&
      session.metadata?.auctionId &&
      session.metadata.buyerId &&
      session.metadata.sellerId
    ) {
      await placeInEscrow({
        auctionId: session.metadata.auctionId,
        buyerId: session.metadata.buyerId,
        sellerId: session.metadata.sellerId,
        amount: (session.amount_total || 0) / 100,
        stripeSessionId: session.id,
        stripePaymentId: String(session.payment_intent || ""),
      });
    }

    res.json({
      status: session.status,
      payment_status: session.payment_status,
      mode: "stripe",
    });
  })
);

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    throw new Error("Stripe webhook secret not configured");
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (
      session.payment_status === "paid" &&
      session.metadata?.auctionId &&
      session.metadata.buyerId &&
      session.metadata.sellerId
    ) {
      await placeInEscrow({
        auctionId: session.metadata.auctionId,
        buyerId: session.metadata.buyerId,
        sellerId: session.metadata.sellerId,
        amount: (session.amount_total || 0) / 100,
        stripeSessionId: session.id,
        stripePaymentId: String(session.payment_intent || ""),
      });
    }
  }
  return event;
}

router.post(
  "/:id/ship",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await markShipped(param(req, "id"), req.user!.id);
    res.json({ escrow });
  })
);

router.post(
  "/:id/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await confirmReceipt(param(req, "id"), req.user!.id);
    res.json({ escrow });
  })
);

router.post(
  "/:id/dispute",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reason = z.string().parse(req.body.reason);
    const escrow = await openDispute(param(req, "id"), req.user!.id, reason);
    res.json({ escrow });
  })
);

export default router;

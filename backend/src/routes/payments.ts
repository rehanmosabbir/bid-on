import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

/** Checkout currency for sandbox — use usd if BDT isn't enabled on the Stripe account. */
function getCurrency() {
  return (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

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
      where: { auctionId, buyerId: req.user!.id, status: "completed" },
    });
    if (existing) return res.status(400).json({ error: "Already paid" });

    const stripe = getStripe();
    if (!stripe) {
      const txn = await prisma.transaction.create({
        data: {
          auctionId,
          buyerId: req.user!.id,
          sellerId: auction.sellerId,
          amount,
          status: "completed",
          stripeSessionId: `dev_${Date.now()}`,
        },
      });
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "sold" },
      });
      return res.json({
        mode: "dev",
        message: "Payment simulated (no Stripe key configured)",
        transaction: txn,
        url: `${process.env.FRONTEND_URL}/checkout/${auctionId}?success=1`,
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user!.email,
      success_url: `${process.env.FRONTEND_URL}/checkout/${auctionId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/${auctionId}?canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: auction.title,
              description: "Won auction payment — Bid On",
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
      session.metadata?.auctionId
    ) {
      await prisma.transaction.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          status: "completed",
          stripePaymentId: String(session.payment_intent || ""),
        },
      });
      await prisma.auction.update({
        where: { id: session.metadata.auctionId },
        data: { status: "sold" },
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const auctionId = session.metadata?.auctionId;
    if (auctionId) {
      await prisma.transaction.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          status: "completed",
          stripePaymentId: String(session.payment_intent || ""),
        },
      });
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "sold" },
      });
    }
  }
  return event;
}

export default router;

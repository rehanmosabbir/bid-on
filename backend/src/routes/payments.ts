import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
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
      // Dev fallback without Stripe keys
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/checkout/${auctionId}?success=1`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/${auctionId}?canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "bdt",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: auction.title,
              description: `Won auction payment`,
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

    res.json({ url: session.url, sessionId: session.id });
  })
);

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

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

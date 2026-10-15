import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function getCurrency() {
  return (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
}

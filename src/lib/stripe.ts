import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
export const stripe = new Stripe(secretKey);

export const PLANS = {
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro", name: "Pro" },
  enterprise: { priceId: process.env.STRIPE_CLINIC_PRICE_ID ?? "price_clinic", name: "Clinic" },
} as const;

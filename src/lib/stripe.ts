import Stripe from "stripe";

function createStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  return new Stripe(secretKey);
}

let _stripe: Stripe | null = null;
const handler: ProxyHandler<Stripe> = {
  get(_, prop) {
    if (!_stripe) _stripe = createStripe();
    return Reflect.get(_stripe, prop);
  },
};

export const stripe = new Proxy({} as Stripe, handler);

export const PLANS = {
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro", name: "Pro" },
  enterprise: { priceId: process.env.STRIPE_CLINIC_PRICE_ID ?? "price_clinic", name: "Clinic" },
} as const;

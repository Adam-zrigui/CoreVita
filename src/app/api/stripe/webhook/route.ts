import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

type SubscriptionWithPeriod = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const tenantId = checkout.metadata?.tenantId;
    const stripeId = checkout.subscription as string;

    if (tenantId && stripeId) {
      const sub = await stripe.subscriptions.retrieve(stripeId) as unknown as SubscriptionWithPeriod;

      // Cancel the old subscription if this tenant had one
      const existing = await prisma.subscription.findUnique({ where: { tenantId } });
      if (existing?.stripeId && existing.stripeId !== stripeId) {
        await stripe.subscriptions.cancel(existing.stripeId);
      }

      await prisma.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          stripeId,
          status: sub.status,
          priceId: sub.items?.data?.[0]?.price?.id,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
        update: {
          stripeId,
          status: sub.status,
          priceId: sub.items?.data?.[0]?.price?.id,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as SubscriptionWithPeriod;
    const tenantId = sub.metadata?.tenantId;
    if (tenantId) {
      await prisma.subscription.update({
        where: { tenantId },
        data: {
          status: sub.status,
          priceId: sub.items?.data?.[0]?.price?.id,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const tenantId = sub.metadata?.tenantId;
    if (tenantId) {
      await prisma.subscription.update({
        where: { tenantId },
        data: { status: "canceled" },
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as unknown as Record<string, unknown>;
    const stripeSubId = typeof invoice.subscription === "string" ? invoice.subscription : null;
    if (stripeSubId) {
      await prisma.subscription.update({
        where: { stripeId: stripeSubId },
        data: { status: "past_due" },
      });
    }
  }

  return NextResponse.json({ received: true });
}

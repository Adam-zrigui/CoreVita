import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS } from "@/lib/stripe";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { tenant: true } } },
  });
  if (!user?.memberships[0]) {
    return NextResponse.json({ error: "No tenant found" }, { status: 400 });
  }

  const { plan, returnUrl } = await request.json();
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (!planConfig) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const tenantId = user.memberships[0].tenantId;
  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const baseReturn = returnUrl ?? "/dashboard/settings";

  const existingSub = await prisma.subscription.findUnique({
    where: { tenantId },
  });

  if (existingSub?.stripeId) {
    const sub = await stripe.subscriptions.retrieve(existingSub.stripeId);

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    if (sub.status === "active" || sub.status === "trialing") {
      // Create a Checkout Session for the new plan (new subscription)
      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        customer: customerId,
        client_reference_id: user.id,
        metadata: { tenantId },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(baseReturn)}`,
        cancel_url: `${origin}${baseReturn}?checkout=cancelled`,
      });

      return NextResponse.json({ url: checkout.url });
    }

    // past_due / canceled → redirect to Stripe Customer Portal
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${baseReturn}`,
    });

    return NextResponse.json({ url: portal.url });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { tenantId },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(baseReturn)}`,
    cancel_url: `${origin}${baseReturn}?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}

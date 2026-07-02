import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ActivateSession } from "./ActivateSession";

export const dynamic = "force-dynamic";

function toDate(ts: number | null | undefined): Date {
  if (ts == null) return new Date();
  const d = new Date(ts * 1000);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; return?: string }>;
}) {
  const { session_id, return: returnPath } = await searchParams;
  if (!session_id) redirect("/login");

  const checkout = await stripe.checkout.sessions.retrieve(session_id);
  const userId = checkout.client_reference_id;
  const tenantId = checkout.metadata?.tenantId;
  const stripeId = checkout.subscription as string;

  if (!userId || !tenantId || !stripeId) {
    console.error("[checkout/success] Missing data", { userId, tenantId, stripeId });
    redirect("/login");
  }

  const sub = await stripe.subscriptions.retrieve(stripeId);
  const item = sub.items?.data?.[0];

  await prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      stripeId,
      status: sub.status,
      priceId: item?.price?.id,
      currentPeriodStart: toDate(item?.current_period_start),
      currentPeriodEnd: toDate(item?.current_period_end),
    },
    update: {
      stripeId,
      status: sub.status,
      priceId: item?.price?.id,
      currentPeriodStart: toDate(item?.current_period_start),
      currentPeriodEnd: toDate(item?.current_period_end),
    },
  });

  const adminAuth = getAdminAuth();
  let customToken: string | null = null;
  if (adminAuth) {
    customToken = await adminAuth.createCustomToken(userId);
  }

  if (!customToken) {
    console.error("[checkout/success] Failed to create custom token");
    redirect("/login");
  }

  return <ActivateSession customToken={customToken} userId={userId} returnPath={returnPath ?? undefined} />;
}

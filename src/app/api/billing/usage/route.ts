import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!membership) {
    return NextResponse.json({ used: 0, limit: 500, remaining: 500, plan: "starter", userLimit: 1, status: "none" });
  }

  const [studyCount, subscription] = await Promise.all([
    prisma.study.count({ where: { tenantId: membership.tenantId } }),
    prisma.subscription.findUnique({ where: { tenantId: membership.tenantId } }),
  ]);

  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.STRIPE_CLINIC_PRICE_ID;

  const planTier = subscription?.priceId === enterprisePriceId ? "enterprise"
    : subscription?.priceId === proPriceId ? "pro"
    : "starter";

  const limits = getPlanLimits(planTier);
  const subStatus = subscription
    ? (subscription.status === "active" || subscription.status === "trialing" ? "active"
      : subscription.status === "past_due" ? "past_due"
      : "canceled")
    : "none";

  return NextResponse.json({
    used: studyCount,
    limit: limits.studies,
    remaining: Math.max(0, limits.studies - studyCount),
    plan: planTier,
    userLimit: limits.users,
    status: subStatus,
  });
}

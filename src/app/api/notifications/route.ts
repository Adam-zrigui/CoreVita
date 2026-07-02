import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { tenant: { include: { subscription: true } } } } },
  });
  const tenant = user?.memberships[0]?.tenant;
  if (!tenant) return NextResponse.json({ notifications: [], unread: 0 });

  const priceId = tenant.subscription?.priceId;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
  const plan = priceId === clinicPriceId ? "enterprise" : priceId === proPriceId ? "pro" : "starter" as const;

  if (!planHasFeature(plan, "audit_log")) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }

  const entries = await prisma.auditLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const actorIds = [...new Set(entries.map((e) => e.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const notifications = entries.map((e) => ({
    id: e.id,
    action: e.action,
    targetId: e.targetId,
    metadata: e.metadata,
    createdAt: e.createdAt.toISOString(),
    actor: actorMap.get(e.actorId) ?? { name: null, email: null },
  }));

  return NextResponse.json({ notifications, unread: notifications.length });
}

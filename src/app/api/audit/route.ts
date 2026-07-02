import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/plans";
import { requireRole } from "@/lib/rbac";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleCheck = await requireRole("audit", session);
  if (roleCheck instanceof Response) return roleCheck;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { tenant: { include: { subscription: true } } } } },
  });
  const tenant = user?.memberships[0]?.tenant;
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const priceId = tenant.subscription?.priceId;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
  const plan = priceId === clinicPriceId ? "enterprise"
    : priceId === proPriceId ? "pro"
    : "starter" as const;

  if (!planHasFeature(plan, "audit_log")) {
    return NextResponse.json({ error: "Audit log requires the Clinic plan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const actionFilter = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (actionFilter) where.action = actionFilter;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      tenant: false,
    },
  });

  const actorIds = [...new Set(entries.map((e) => e.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const enriched = entries.map((e) => ({
    id: e.id,
    action: e.action,
    targetId: e.targetId,
    metadata: e.metadata,
    createdAt: e.createdAt,
    actor: actorMap.get(e.actorId) ?? { id: e.actorId, name: null, email: null },
  }));

  return NextResponse.json(enriched);
}

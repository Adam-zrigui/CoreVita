import { prisma } from "@/lib/prisma";
import { planHasFeature } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";
import type { Prisma } from "../../prisma/generated";

export type AuditAction =
  | "member.invite"
  | "member.remove"
  | "member.role_change"
  | "study.upload"
  | "study.delete"
  | "share.create"
  | "share.revoke"
  | "report.create"
  | "report.ai"
  | "team.settings"
  | "login";

export async function logAudit(
  tenantId: string,
  actorId: string,
  action: AuditAction,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      subscription: { select: { priceId: true } },
    },
  });

  const priceId = tenant?.subscription?.priceId;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
  const plan: PlanTier = priceId === clinicPriceId ? "enterprise"
    : priceId === proPriceId ? "pro"
    : "starter";

  if (!planHasFeature(plan, "audit_log")) return;

  const data: Prisma.AuditLogUncheckedCreateInput = {
    tenantId,
    actorId,
    action,
  };
  if (targetId) data.targetId = targetId;
  if (metadata) data.metadata = metadata as Prisma.InputJsonValue;

  try {
    await prisma.auditLog.create({ data });
  } catch (e) {
    console.error("[audit] log write failed:", e);
  }
}

const RETENTION_DAYS: Record<PlanTier, number> = {
  starter: 30,
  pro: 365,
  enterprise: 730,
};

export async function pruneAuditLogs(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subscription: { select: { priceId: true } } },
  });

  const priceId = tenant?.subscription?.priceId;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
  const plan: PlanTier = priceId === clinicPriceId ? "enterprise"
    : priceId === proPriceId ? "pro"
    : "starter";

  const retentionDays = RETENTION_DAYS[plan];
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { count } = await prisma.auditLog.deleteMany({
    where: { tenantId, createdAt: { lt: cutoff } },
  });
  return count;
}

import { getServerSession, type AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PlanTier = "starter" | "pro" | "enterprise";
export type PlanStatus = "none" | "active" | "past_due" | "canceled";

export type PlanInfo = {
  plan: PlanTier;
  used: number;
  limit: number;
  status: PlanStatus;
  userLimit: number;
};

export type Feature =
  | "advanced_viewer"
  | "structured_reports"
  | "ai_triage"
  | "priority_support"
  | "dedicated_support"
  | "on_prem_deploy"
  | "custom_branding"
  | "api_access"
  | "audit_log";

const PLAN_LIMITS: Record<PlanTier, { studies: number; users: number; features: Feature[] }> = {
  starter: {
    studies: 500,
    users: 1,
    features: [],
  },
  pro: {
    studies: 999999,
    users: 5,
    features: ["advanced_viewer", "structured_reports", "ai_triage", "priority_support", "audit_log"],
  },
  enterprise: {
    studies: 999999,
    users: 999999,
    features: [
      "advanced_viewer",
      "structured_reports",
      "ai_triage",
      "priority_support",
      "dedicated_support",
      "on_prem_deploy",
      "custom_branding",
      "api_access",
      "audit_log",
    ],
  },
};

export function getPlanLimits(plan: PlanTier) {
  return PLAN_LIMITS[plan];
}

export function planHasFeature(plan: PlanTier, feature: Feature): boolean {
  return PLAN_LIMITS[plan].features.includes(feature);
}

export function getMaxUsers(plan: PlanTier): number {
  return PLAN_LIMITS[plan].users;
}

export function getStudyLimit(plan: PlanTier): number {
  return PLAN_LIMITS[plan].studies;
}

export function isFreeTier(plan: PlanTier): boolean {
  return plan === "starter";
}

export function getStudyWindowFilter(plan: PlanTier): { createdAt?: { gte: Date } } {
  if (plan === "starter") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return { createdAt: { gte: weekAgo } };
  }
  return {};
}

export function clearPlanCache() {
  /* noop — removed in-memory cache to fix stale data across serverless instances */
}

export async function getCurrentPlan(session?: AuthSession | null): Promise<PlanInfo> {
  try {
    const s = session ?? await getServerSession();
    if (!s?.user?.id) return { plan: "starter", used: 0, limit: 500, status: "none", userLimit: 1 };

    const membership = await prisma.membership.findFirst({
      where: { userId: s.user.id },
      select: { tenantId: true },
    });

    if (!membership) {
      return { plan: "starter", used: 0, limit: 500, status: "none", userLimit: 1 };
    }

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: membership.tenantId },
      select: { priceId: true, status: true },
    });

    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
    const plan: PlanTier = subscription?.priceId === clinicPriceId
      ? "enterprise"
      : subscription?.priceId === proPriceId
        ? "pro"
        : "starter";

    const windowFilter = getStudyWindowFilter(plan);
    const used = await prisma.study.count({
      where: { tenantId: membership.tenantId, ...windowFilter },
    });

    if (!subscription) {
      return { plan: "starter", used, limit: 500, status: "none", userLimit: 1 };
    }

    const limits = PLAN_LIMITS[plan];
    const subStatus = subscription.status === "active" || subscription.status === "trialing" ? "active"
      : subscription.status === "past_due" ? "past_due" as const
      : "canceled" as const;

    return {
      plan,
      used,
      limit: limits.studies,
      status: subStatus,
      userLimit: limits.users,
    };
  } catch {
    return { plan: "starter", used: 0, limit: 500, status: "none", userLimit: 1 };
  }
}

export async function needsPlan(session?: AuthSession | null): Promise<boolean> {
  const info = await getCurrentPlan(session);
  return info.status === "none";
}

export async function requireActivePlan(): Promise<PlanInfo | Response> {
  const info = await getCurrentPlan();
  if (info.status === "none") {
    return Response.json({ error: "Subscription required", redirect: "/services/pricing" }, { status: 402 });
  }
  return info;
}

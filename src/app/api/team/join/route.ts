import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMaxUsers } from "@/lib/plans";
import { z } from "zod";

const joinSchema = z.object({
  slug: z.string().min(1),
});

function resolvePlan(subscription: { priceId: string | null } | null): "starter" | "pro" | "enterprise" {
  if (!subscription) return "starter";
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
  return subscription.priceId === clinicPriceId
    ? "enterprise"
    : subscription.priceId === proPriceId
      ? "pro"
      : "starter";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(tenant);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let slug: string;
  try {
    const parsed = joinSchema.parse(await request.json());
    slug = parsed.slug;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const existing = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: session.user.id, tenantId: tenant.id } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
    select: { priceId: true },
  });

  const plan = resolvePlan(subscription);
  const maxUsers = getMaxUsers(plan);
  const currentCount = await prisma.membership.count({ where: { tenantId: tenant.id } });
  if (currentCount >= maxUsers) {
    return NextResponse.json({ error: "Organization is at member capacity" }, { status: 403 });
  }

  await prisma.membership.create({
    data: {
      userId: session.user.id,
      tenantId: tenant.id,
    },
  });

  return NextResponse.json({ success: true, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } });
}

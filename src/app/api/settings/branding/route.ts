import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!membership) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const branding = await prisma.branding.findUnique({
    where: { tenantId: membership.tenantId },
  });

  return NextResponse.json({ branding: branding ?? null });
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true, role: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change branding" }, { status: 403 });
  }

  const plan = await getCurrentPlan(session);
  if (!planHasFeature(plan.plan, "custom_branding")) {
    return NextResponse.json({ error: "Custom branding requires the Clinic plan" }, { status: 403 });
  }

  const { logoUrl, primaryColor, accentColor } = await request.json();

  const branding = await prisma.branding.upsert({
    where: { tenantId: membership.tenantId },
    create: { tenantId: membership.tenantId, logoUrl, primaryColor, accentColor },
    update: { logoUrl, primaryColor, accentColor },
  });

  return NextResponse.json({ branding });
}

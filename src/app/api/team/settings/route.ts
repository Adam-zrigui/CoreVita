import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { tenant: true } } },
  });
  const tenant = user?.memberships[0]?.tenant;
  if (!tenant) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  return NextResponse.json({ name: tenant.name, slug: tenant.slug });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roleCheck = await requireRole("team.settings", session);
  if (roleCheck instanceof Response) return roleCheck;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true },
  });
  const myMembership = user?.memberships[0];
  if (!myMembership) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { name, slug } = await request.json();

  const data: Record<string, string> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof slug === "string" && slug.trim()) {
    const sanitized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (sanitized) data.slug = sanitized;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: myMembership.tenantId },
    data,
  });

  logAudit(myMembership.tenantId, session.user.id, "team.settings", undefined, data).catch((e) => console.error("[audit] team.settings failed:", e));

  return NextResponse.json({ name: tenant.name, slug: tenant.slug });
}

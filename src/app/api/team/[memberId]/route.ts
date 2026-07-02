import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "../../../../../prisma/generated";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = await request.json();
  if (!role) return NextResponse.json({ error: "Role required" }, { status: 400 });
  if (!Object.values(Role).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true },
  });
  const myMembership = user?.memberships[0];
  if (!myMembership || myMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can update roles" }, { status: 403 });
  }

  const target = await prisma.membership.findUnique({
    where: { id: memberId },
    select: { tenantId: true },
  });
  if (!target || target.tenantId !== myMembership.tenantId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await prisma.membership.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  logAudit(myMembership.tenantId, session.user.id, "member.role_change", memberId, { newRole: role }).catch((e) => console.error("[audit] member.role_change failed:", e));

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true },
  });
  const myMembership = user?.memberships[0];
  if (!myMembership || myMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
  }

  const target = await prisma.membership.findUnique({
    where: { id: memberId },
    select: { tenantId: true },
  });
  if (!target || target.tenantId !== myMembership.tenantId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await prisma.membership.delete({ where: { id: memberId } });

  logAudit(myMembership.tenantId, session.user.id, "member.remove", memberId).catch((e) => console.error("[audit] member.remove failed:", e));

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "../../../../prisma/generated";
import { getCurrentPlan, getMaxUsers } from "@/lib/plans";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email().min(1),
  role: z.enum(["ADMIN", "RADIOLOGIST", "ASSISTANT", "VIEWER"]).optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { include: { tenant: true } } },
  });
  const tenantId = user?.memberships[0]?.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const url = new URL(request.url);
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") || "0", 10), 0);

  const [members, total, planInfo] = await Promise.all([
    prisma.membership.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take,
      skip,
    }),
    prisma.membership.count({ where: { tenantId } }),
    getCurrentPlan(),
  ]);

  return NextResponse.json({
    members,
    total,
    skip,
    take,
    tenant: user?.memberships[0]?.tenant ?? null,
    plan: planInfo.plan,
    memberLimit: getMaxUsers(planInfo.plan),
    memberCount: total,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let email: string, role: string | undefined;
  try {
    const parsed = inviteSchema.parse(await request.json());
    email = parsed.email;
    role = parsed.role;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const validRole: Role = Object.values(Role).includes(role as any) ? (role as Role) : Role.VIEWER;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: true },
  });
  const myMembership = user?.memberships[0];
  if (!myMembership || myMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can invite" }, { status: 403 });
  }

  const currentMemberCount = await prisma.membership.count({
    where: { tenantId: myMembership.tenantId },
  });

  const planInfo = await getCurrentPlan();
  const userLimit = getMaxUsers(planInfo.plan);
  if (currentMemberCount >= userLimit) {
    return NextResponse.json(
      { error: `User limit reached (${userLimit}). Upgrade to add more members.` },
      { status: 403 }
    );
  }

  const inviteUser = await prisma.user.findUnique({ where: { email } });
  if (!inviteUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: inviteUser.id, tenantId: myMembership.tenantId } },
  });
  if (existing) return NextResponse.json({ error: "Already a member" }, { status: 409 });

  const membership = await prisma.membership.create({
    data: {
      userId: inviteUser.id,
      tenantId: myMembership.tenantId,
      role: validRole,
    },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  logAudit(myMembership.tenantId, session.user.id, "member.invite", inviteUser.id, { role: validRole, email }).catch((e) => console.error("[audit] member.invite failed:", e));

  return NextResponse.json(membership, { status: 201 });
}

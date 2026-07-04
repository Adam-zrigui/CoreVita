import { getServerSession, type AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserTenant } from "@/lib/db";
import { NextResponse } from "next/server";

export async function getActorTenant(session?: AuthSession | null): Promise<{ actorId: string; tenantId: string } | NextResponse> {
  const s = session ?? await getServerSession();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserTenant(s.user.id);

  const membership = await prisma.membership.findFirst({
    where: { userId: s.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  return { actorId: s.user.id, tenantId: membership.tenantId };
}

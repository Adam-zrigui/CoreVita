import { getServerSession, type AuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type AppRole = "ADMIN" | "RADIOLOGIST" | "ASSISTANT" | "VIEWER";

const ROLE_HIERARCHY: Record<AppRole, number> = {
  ADMIN: 100,
  RADIOLOGIST: 60,
  ASSISTANT: 40,
  VIEWER: 20,
};

const MIN_ROLE: Record<string, AppRole> = {
  upload: "ASSISTANT",
  "studies.delete": "ADMIN",
  "studies.view": "ASSISTANT",
  "reports.create": "RADIOLOGIST",
  "reports.ai": "RADIOLOGIST",
  "share.create": "RADIOLOGIST",
  "team.manage": "ADMIN",
  "team.settings": "ADMIN",
  audit: "ADMIN",
  "study.delete": "ADMIN",
};

export function roleAtLeast(role: AppRole, minimum: AppRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function getRequiredRole(action: string): AppRole {
  return MIN_ROLE[action] ?? "VIEWER";
}

export async function getSessionRole(session?: AuthSession | null): Promise<AppRole | null> {
  const s = session ?? await getServerSession();
  return (s?.user?.role as AppRole) ?? null;
}

export async function requireRole(action: string, session?: AuthSession | null): Promise<{ role: AppRole } | NextResponse> {
  const s = session ?? await getServerSession();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: s.user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true },
  });
  const role = (membership?.role ?? s.user.role) as AppRole;
  const required = getRequiredRole(action);

  if (!roleAtLeast(role, required)) {
    return NextResponse.json(
      { error: `This action requires the ${required} role or higher` },
      { status: 403 }
    );
  }

  return { role };
}

export async function getActorTenant(session?: AuthSession | null): Promise<{ actorId: string; tenantId: string } | NextResponse> {
  const s = session ?? await getServerSession();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    include: { memberships: { take: 1 } },
  });

  const tenantId = user?.memberships[0]?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  return { actorId: s.user.id, tenantId };
}

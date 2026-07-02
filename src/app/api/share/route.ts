import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPlan } from "@/lib/plans";
import { requireRole, getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleCheck = await requireRole("share.create", session);
  if (roleCheck instanceof Response) return roleCheck;

  const planInfo = await getCurrentPlan(session);
  const isFree = planInfo.plan === "starter" || planInfo.status === "none";

  const { studyId, expiresInDays, password, allowDownload } = await request.json();
  if (!studyId) {
    return NextResponse.json({ error: "Missing studyId" }, { status: 400 });
  }

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { tenantId: true },
  });
  if (!study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  const actorInfo = await getActorTenant(session);
  if (actorInfo instanceof Response) return actorInfo;
  if (study.tenantId !== actorInfo.tenantId) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  let days: number;
  if (isFree) {
    days = 7;
  } else {
    const allowed = [7, 14, 30];
    days = allowed.includes(expiresInDays) ? expiresInDays : 7;
  }

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  const share = await prisma.shareToken.create({
    data: {
      token,
      studyId,
      expiresAt,
      password: password ? crypto.createHash("sha256").update(password).digest("hex") : null,
      allowDownload: !!allowDownload,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/share/${share.token}`;

  logAudit(actorInfo.tenantId, actorInfo.actorId, "share.create", studyId, { token: share.token }).catch((e) => console.error("[audit] share.create failed:", e));

  return NextResponse.json({ token: share.token, url: shareUrl, expiresAt: share.expiresAt });
}

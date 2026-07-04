import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getRedis, clearStudiesCache } from "@/lib/redis";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No study IDs provided" }, { status: 400 });
  }

  const actorInfo = await getActorTenant(session);
  if (actorInfo instanceof Response) return actorInfo;

  const result = await prisma.study.deleteMany({
    where: { id: { in: ids }, tenantId: actorInfo.tenantId, uploadedById: session.user.id },
  });

  for (const id of ids) {
    logAudit(actorInfo.tenantId, actorInfo.actorId, "study.delete", id).catch((e) => console.error("[audit] study.delete failed:", e));
  }

  try {
    const redis = getRedis();
    if (redis) await clearStudiesCache(redis);
  } catch {
    // cache invalidation failure is non-fatal
  }

  return NextResponse.json({ deleted: result.count });
}

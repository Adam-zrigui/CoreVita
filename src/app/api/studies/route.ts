import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRedis, clearStudiesCache } from "@/lib/redis";
import { getCurrentPlan, getStudyWindowFilter } from "@/lib/plans";
import { getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { StudyStatus, type Prisma } from "../../../../prisma/generated";

function parseStudyStatus(status: string | null) {
  if (!status) return undefined;
  return Object.values(StudyStatus).includes(status as StudyStatus)
    ? (status as StudyStatus)
    : undefined;
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const studyUid = url.searchParams.get("studyUid");
  const modality = url.searchParams.get("modality");
  const patient = url.searchParams.get("patient");
  const status = url.searchParams.get("status");
  const take = Math.min(Math.max(parseInt(url.searchParams.get("take") ?? "50", 10) || 50, 1), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10) || 0, 0);
  const parsedStatus = parseStudyStatus(status);
  const [actorInfo, planInfo] = await Promise.all([
    getActorTenant(session),
    getCurrentPlan(session),
  ]);
  if (actorInfo instanceof Response) return actorInfo;
  const plan = planInfo.plan;
  const redis = getRedis();

  if (!studyUid && redis) {
      const key = `studies:all:${actorInfo.tenantId}:${session.user.id}:${take}:${skip}:${modality ?? ""}:${patient ?? ""}:${status ?? ""}:${plan}`;
    const cached = await redis.get(key);
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached));
      } catch {
        // fall through
      }
    }
  }

  const where: Prisma.StudyWhereInput = {
    tenantId: actorInfo.tenantId,
    uploadedById: session.user.id,
    ...(studyUid ? { studyUid } : {}),
    ...(modality ? { modality } : {}),
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(patient
      ? { patientName: { contains: patient, mode: "insensitive" } }
      : {}),
    ...getStudyWindowFilter(plan),
  };

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where,
      select: {
        id: true,
        studyUid: true,
        patientName: true,
        title: true,
        modality: true,
        slices: true,
        status: true,
        createdAt: true,
        series: { select: { id: true, seriesUid: true, modality: true, instanceCount: true }, take: 50 },
        reports: { select: { id: true, status: true, createdAt: true, authorId: true }, take: 50 },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.study.count({ where }),
  ]);

  if (!studyUid && redis) {
    try {
    const key = `studies:all:${actorInfo.tenantId}:${session.user.id}:${take}:${skip}:${modality ?? ""}:${patient ?? ""}:${status ?? ""}:${plan}`;
      await redis.set(key, JSON.stringify(studies), "EX", 60);
    } catch {
      // cache write failure is non-fatal
    }
  }
  return NextResponse.json(studies, { headers: { "X-Total-Count": String(total) } });
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let actorInfo = await getActorTenant(session);
  if (actorInfo instanceof Response) return actorInfo;

  const url = new URL(req.url);
  const studyUid = url.searchParams.get("studyUid");
  if (!studyUid) {
    return NextResponse.json({ error: "Missing studyUid" }, { status: 400 });
  }

  const { count } = await prisma.study.deleteMany({
    where: { studyUid, tenantId: actorInfo.tenantId, uploadedById: session.user.id },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }
  try {
    const redis2 = getRedis();
    if (redis2) await clearStudiesCache(redis2);
  } catch {
    // cache invalidation failure is non-fatal
  }

  actorInfo = await getActorTenant(session);
  if (!(actorInfo instanceof Response)) {
    logAudit(actorInfo.tenantId, actorInfo.actorId, "study.delete", studyUid).catch((e) => console.error("[audit] study.delete failed:", e));
  }

  return NextResponse.json({ ok: true });
}

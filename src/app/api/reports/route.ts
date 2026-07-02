import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { requireRole, getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateAiReport } from "@/lib/ai-report";
import { z } from "zod";

const createReportSchema = z.object({
  studyId: z.string().min(1),
  content: z.string().optional(),
  ai: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { take: 1 } },
  });
  const tenantId = user?.memberships[0]?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const url = new URL(request.url);
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") || "0", 10), 0);

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { study: { tenantId } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        status: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
        study: { select: { id: true, patientName: true, studyUid: true } },
      },
    }),
    prisma.report.count({ where: { study: { tenantId } } }),
  ]);

  return NextResponse.json({ reports, total, skip, take });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { take: 1 } },
  });
  const tenantId = user?.memberships[0]?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  let studyId: string, content: string | undefined, ai: boolean | undefined;
  try {
    const parsed = createReportSchema.parse(await request.json());
    studyId = parsed.studyId;
    content = parsed.content;
    ai = parsed.ai;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (ai) {
    const planInfo = await getCurrentPlan(session);
    if (!planHasFeature(planInfo.plan, "ai_triage")) {
      return NextResponse.json({ error: "AI report generation requires Pro plan" }, { status: 402 });
    }
    const roleCheck = await requireRole("reports.ai", session);
    if (roleCheck instanceof Response) return roleCheck;

    const study = await prisma.study.findFirst({
      where: { OR: [{ id: studyId }, { studyUid: studyId }], tenantId },
    });
    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }
    if (planInfo.plan === "starter" && study.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json({ error: "This study has expired. Upgrade to Pro to access older studies." }, { status: 403 });
    }

    try {
      const series = await prisma.series.findMany({
        where: { studyId: study.id },
        select: { modality: true, instanceCount: true },
      });
      const result = await generateAiReport(study.id, tenantId, {
        patientName: study.patientName,
        modality: study.modality,
        description: study.description,
        studyDate: study.studyDate,
        series,
      });
      const [report] = await prisma.$transaction([
        prisma.report.create({
          data: {
            studyId: study.id,
            content: result.content,
            status: "DRAFT",
          },
        }),
        prisma.study.updateMany({
          where: { id: study.id, status: "READING" },
          data: { status: "REPORTED" },
        }),
      ]);

      const actorInfo = await getActorTenant(session);
      if (!(actorInfo instanceof Response)) {
        logAudit(actorInfo.tenantId, actorInfo.actorId, "report.ai", study.id).catch((e) => console.error("[audit] report.ai failed:", e));
      }

      return NextResponse.json(report, { status: 201 });
    } catch {
      return NextResponse.json({ error: "AI report generation failed" }, { status: 500 });
    }
  }

  if (!studyId || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Missing or invalid studyId or content" }, { status: 400 });
  }

  const planInfo = await getCurrentPlan(session);
  if (!planHasFeature(planInfo.plan, "structured_reports")) {
    return NextResponse.json({ error: "Structured reports require the Pro plan" }, { status: 402 });
  }
  const roleCheck = await requireRole("reports.create", session);
  if (roleCheck instanceof Response) return roleCheck;

  const study = await prisma.study.findFirst({
    where: { OR: [{ id: studyId }, { studyUid: studyId }], tenantId },
  });
  if (!study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }
  if (planInfo.plan === "starter" && study.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "This study has expired. Upgrade to Pro to access older studies." }, { status: 403 });
  }

  const [report] = await prisma.$transaction([
    prisma.report.create({
      data: {
        studyId: study.id,
        authorId: session.user.id,
        content,
        status: "DRAFT",
      },
    }),
    prisma.study.updateMany({
      where: { id: study.id, status: "READING" },
      data: { status: "REPORTED" },
    }),
  ]);

  const actorInfo = await getActorTenant(session);
  if (!(actorInfo instanceof Response)) {
    logAudit(actorInfo.tenantId, actorInfo.actorId, "report.create", study.id).catch((e) => console.error("[audit] report.create failed:", e));
  }

  return NextResponse.json(report, { status: 201 });
}

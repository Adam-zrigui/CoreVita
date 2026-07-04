import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan } from "@/lib/plans";
import { getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { sendStudyReportEmail } from "@/lib/email";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["PENDING", "READING", "REPORTED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studyId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planInfo = await getCurrentPlan(session);
    if (planInfo.plan === "starter") {
      return NextResponse.json({ error: "Upgrade to Pro to update study status" }, { status: 403 });
    }

    const { studyId } = await params;
    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) return actorInfo;

    const body = await req.json();
    const parsed = statusSchema.parse(body);

    const study = await prisma.study.findFirst({
      where: { studyUid: studyId, tenantId: actorInfo.tenantId, uploadedById: session.user.id },
      select: { id: true, title: true, patientName: true, studyDate: true, uploadedById: true, tenantId: true },
    });

    if (!study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    await prisma.study.update({
      where: { id: study.id },
      data: {
        status: parsed.status,
        reportedAt: parsed.status === "REPORTED" ? new Date() : undefined,
      },
    });

    if (parsed.status === "REPORTED") {
      logAudit(actorInfo.tenantId, session.user.id, "study.reported", studyId);

      const uploader = await prisma.user.findUnique({
        where: { id: study.uploadedById! },
        select: { email: true, notificationPreference: true },
      });

      if (uploader?.email && (uploader.notificationPreference?.email ?? true)) {
        sendStudyReportEmail({
          email: uploader.email,
          studyTitle: study.title ?? "",
          studyDate: study.studyDate,
          patientName: study.patientName,
          studyUid: studyId,
        }).catch((e) => console.error("[status] report email failed:", e));
      }
    }

    return NextResponse.json({ success: true, status: parsed.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    console.error("[studies/status] failed:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

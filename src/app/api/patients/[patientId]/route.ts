import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActorTenant } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) return actorInfo;

    const { patientId: rawPatientId } = await params;
    const patientId = rawPatientId === "_unknown" ? null : rawPatientId;

    const studies = await prisma.study.findMany({
      where: {
        tenantId: actorInfo.tenantId,
        uploadedById: session.user.id,
        ...(patientId === null
          ? { patientId: null }
          : { patientId }),
        visible: true,
      },
      select: {
        id: true,
        studyUid: true,
        patientName: true,
        title: true,
        modality: true,
        studyDate: true,
        slices: true,
        status: true,
        description: true,
        createdAt: true,
        _count: { select: { series: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const patientName = studies[0]?.patientName ?? null;

    return NextResponse.json({ patientId: rawPatientId === "_unknown" ? null : rawPatientId, patientName, studies });
  } catch (error) {
    console.error("[patients/detail] failed:", error);
    return NextResponse.json({ error: "Failed to load patient" }, { status: 500 });
  }
}

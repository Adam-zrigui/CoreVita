import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActorTenant } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) return actorInfo;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";

    const studies = await prisma.study.findMany({
      where: {
        tenantId: actorInfo.tenantId,
        uploadedById: session.user.id,
        visible: true,
        ...(search ? {
          OR: [
            { patientName: { contains: search, mode: "insensitive" } },
            { patientId: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: {
        patientId: true,
        patientName: true,
        studyDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const patientMap = new Map<string, {
      patientId: string | null;
      patientName: string | null;
      studyCount: number;
      latestStudyDate: string | null;
    }>();

    for (const s of studies) {
      const key = s.patientId ?? `__missing__${s.patientName ?? Math.random()}`;
      const existing = patientMap.get(key);
      if (existing) {
        existing.studyCount++;
        if (!existing.latestStudyDate || (s.studyDate && s.studyDate > existing.latestStudyDate)) {
          existing.latestStudyDate = s.studyDate;
        }
      } else {
        patientMap.set(key, {
          patientId: s.patientId,
          patientName: s.patientName,
          studyCount: 1,
          latestStudyDate: s.studyDate,
        });
      }
    }

    const patients = Array.from(patientMap.values()).sort((a, b) => (b.latestStudyDate ?? "").localeCompare(a.latestStudyDate ?? ""));

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("[patients] failed:", error);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
}

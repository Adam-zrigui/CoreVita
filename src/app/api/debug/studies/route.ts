import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getActorTenant } from "@/lib/rbac";
import { getDashboardData } from "@/lib/dashboard";
import { getCurrentPlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ session: null, error: "No session" });
    }

    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) {
      return NextResponse.json({ actorError: "getActorTenant returned Response", session: { user: session.user } });
    }

    const planResult = await getCurrentPlan(session);

    const totalStudies = await prisma.study.count({ where: { tenantId: actorInfo.tenantId } });
    const myStudies = await prisma.study.count({ where: { tenantId: actorInfo.tenantId, uploadedById: actorInfo.actorId } });

    let dashboardData = null;
    let dashboardError = null;
    try {
      dashboardData = await getDashboardData(actorInfo.tenantId, 8, planResult.plan, actorInfo.actorId);
    } catch (e) {
      dashboardError = e instanceof Error ? e.message : String(e);
    }

    const recent = await prisma.study.findMany({
      where: { tenantId: actorInfo.tenantId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, studyUid: true, patientName: true, status: true, slices: true, uploadedById: true, createdAt: true },
    });

    return NextResponse.json({
      userId: session.user.id,
      tenantId: actorInfo.tenantId,
      actorId: actorInfo.actorId,
      totalStudies,
      myStudies,
      dashboardData: dashboardData ? { totalStudies: dashboardData.totalStudies, recentCount: dashboardData.recentStudies.length } : null,
      dashboardError,
      recent,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

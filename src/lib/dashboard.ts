import { prisma } from "@/lib/prisma";
import { getStudyWindowFilter } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";

const RECENT_SHARES_LIMIT = 8;
const VOLUME_DAYS = 30;

export type VolumeEntry = { date: string; count: number };

export type DashboardData = {
  totalStudies: number;
  studiesByStatus: { status: string; _count: number }[];
  totalReports: number;
  teamMembers: number;
  totalImages: number;
  activeShares: number;
  sharesThisMonth: number;
  reportedCount: number;
  avgTurnaroundHours: number | null;
  studyVolume: VolumeEntry[];
  recentStudies: Array<{
    id: string;
    studyUid: string;
    patientName: string | null;
    title?: string | null;
    modality: string | null;
    slices: number;
    status: string;
    shareCount: number;
    createdAt: Date;
  }>;
  recentShares: Array<{
    id: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    study: { patientName: string | null; title?: string | null; id: string };
  }>;
};

export async function getDashboardData(tenantId: string, take = 20, plan?: PlanTier, actorId?: string): Promise<DashboardData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const studyWhere: Record<string, unknown> = { tenantId, ...getStudyWindowFilter(plan ?? "starter") };
  if (actorId) studyWhere.uploadedById = actorId;

  const volumeStart = new Date(Date.now() - VOLUME_DAYS * 24 * 60 * 60 * 1000);

  const [totalStudies, studiesByStatus, totalReports, teamMembers, imageAgg, activeShares, sharesThisMonth, recentStudies, recentShares, reportedStudies, volumeRaw] = await Promise.all([
    prisma.study.count({ where: studyWhere }),
    prisma.study.groupBy({
      by: ["status"],
      where: studyWhere,
      _count: true,
    }),
    prisma.report.count({ where: { study: { tenantId, uploadedById: actorId } } }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.study.aggregate({ where: studyWhere, _sum: { slices: true } }),
    prisma.shareToken.count({
      where: {
        study: { tenantId },
        createdById: actorId,
        expiresAt: { gt: new Date() },
      },
    }),
    prisma.shareToken.count({
      where: {
        study: { tenantId },
        createdById: actorId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.study.findMany({
      where: studyWhere,
      select: {
        id: true,
        studyUid: true,
        patientName: true,
        title: true,
        modality: true,
        slices: true,
        status: true,
        createdAt: true,
        _count: { select: { shareTokens: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.shareToken.findMany({
      where: { study: { tenantId }, createdById: actorId },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        study: { select: { patientName: true, title: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_SHARES_LIMIT,
    }),
    prisma.study.findMany({
      where: { ...studyWhere, reportedAt: { not: null } },
      select: { createdAt: true, reportedAt: true },
    }),
    prisma.study.findMany({
      where: { ...studyWhere, createdAt: { gte: volumeStart } },
      select: { createdAt: true },
    }),
  ]);

  const reportedCount = studiesByStatus.find((s) => s.status === "REPORTED")?._count ?? 0;

  const avgTurnaroundHours = reportedStudies.length > 0
    ? Math.round(
        reportedStudies.reduce((sum, s) => {
          if (!s.reportedAt) return sum;
          return sum + (s.reportedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / reportedStudies.length
      )
    : null;

  const volumeMap = new Map<string, number>();
  for (let i = VOLUME_DAYS; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    volumeMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const entry of volumeRaw) {
    const key = entry.createdAt.toISOString().slice(0, 10);
    volumeMap.set(key, (volumeMap.get(key) ?? 0) + 1);
  }
  const studyVolume: VolumeEntry[] = [];
  for (const [date, count] of volumeMap) {
    studyVolume.push({ date, count });
  }

  return {
    totalStudies,
    studiesByStatus,
    totalReports,
    teamMembers,
    totalImages: imageAgg._sum.slices ?? 0,
    activeShares,
    sharesThisMonth,
    reportedCount,
    avgTurnaroundHours,
    studyVolume,
    recentStudies: recentStudies.map((s) => ({
      id: s.id,
      studyUid: s.studyUid,
      patientName: s.patientName,
      title: s.title,
      modality: s.modality,
      slices: s.slices,
      status: s.status,
      shareCount: s._count.shareTokens,
      createdAt: s.createdAt,
    })),
    recentShares,
  };
}

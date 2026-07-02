import { BarChart3, ImageIcon, FileText, Share2 } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";

async function getStatsCardsData(tenantId: string) {
  const [totalStudies, totalImages, totalReports, activeShares, reportedStudies] = await Promise.all([
    prisma.study.count({ where: { tenantId } }),
    prisma.study.aggregate({ where: { tenantId }, _sum: { slices: true } }),
    prisma.report.count({ where: { study: { tenantId } } }),
    prisma.shareToken.count({
      where: { study: { tenantId }, expiresAt: { gt: new Date() } },
    }),
    prisma.study.count({ where: { tenantId, status: "REPORTED" } }),
  ]);

  return {
    totalStudies,
    totalImages: totalImages._sum.slices ?? 0,
    totalReports,
    activeShares,
    reportedCount: reportedStudies,
  };
}

async function StatsCardsContent() {
  const tenant = await getDefaultTenant();
  const data = await getStatsCardsData(tenant.id);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        icon={<BarChart3 className="h-4 w-4" />}
        label="Total Studies"
        value={data.totalStudies}
        gradient="emerald"
      />
      <StatsCard
        icon={<ImageIcon className="h-4 w-4" />}
        label="Total Images"
        value={data.totalImages.toLocaleString()}
        gradient="sky"
      />
      <StatsCard
        icon={<FileText className="h-4 w-4" />}
        label="Reports"
        value={data.totalReports}
        gradient="violet"
        trend={
          data.totalReports > 0
            ? { direction: "up", label: `${data.reportedCount} completed` }
            : undefined
        }
      />
      <StatsCard
        icon={<Share2 className="h-4 w-4" />}
        label="Active Shares"
        value={data.activeShares}
        gradient="amber"
      />
    </div>
  );
}

export function StatsCards() {
  return (
    <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      ))}
    </div>}>{
      <StatsCardsContent />
    }</Suspense>
  );
}

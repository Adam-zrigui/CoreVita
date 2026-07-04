import { BarChart3, ImageIcon, FileText, Share2 } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Suspense } from "react";

type StatsCardsData = {
  totalStudies: number;
  totalImages: number;
  totalReports: number;
  activeShares: number;
  reportedCount: number;
};

function StatsCardsContent({ data }: { data: StatsCardsData }) {

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

export function StatsCards({ data }: { data: StatsCardsData }) {
  return (
    <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl border border-white/[0.06] bg-white/[0.02]" />
      ))}
    </div>}>
      <StatsCardsContent data={data} />
    </Suspense>
  );
}

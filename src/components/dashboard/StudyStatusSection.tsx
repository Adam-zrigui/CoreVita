import { Clock, Activity, FileText, Radio } from "lucide-react";
import { ActivityFeed, type Activity as ActivityFeedItem } from "./ActivityFeed";
import { Suspense } from "react";

type StudyStatusSectionProps = {
  studiesByStatus: Array<{ label: string; value: number; percentage: number }>;
  teamMembers: number;
  activities: ActivityFeedItem[];
};

function StudyStatusSectionContent({ data }: { data: StudyStatusSectionProps }) {
  return (
    <div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-slate-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Study Status
          </h2>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: data.studiesByStatus.find(s => s.label === "PENDING")?.value ?? 0, bar: "bg-amber-500", text: "text-amber-400", icon: Clock },
            { label: "Reading", value: data.studiesByStatus.find(s => s.label === "READING")?.value ?? 0, bar: "bg-sky-500", text: "text-sky-400", icon: Activity },
            { label: "Reported", value: data.studiesByStatus.find(s => s.label === "REPORTED")?.value ?? 0, bar: "bg-emerald-500", text: "text-emerald-400", icon: FileText },
          ].map((s) => {
            const max = Math.max(
              data.studiesByStatus.find(sg => sg.label === "PENDING")?.value ?? 0,
              data.studiesByStatus.find(sg => sg.label === "READING")?.value ?? 0,
              data.studiesByStatus.find(sg => sg.label === "REPORTED")?.value ?? 0,
              1
            );
            const Icon = s.icon;
            return (
              <div key={s.label}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${s.text}`} />
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${s.text}`}>
                    {s.label}
                  </div>
                </div>
                <div className="mt-1.5 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {s.value}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${s.bar}`}
                    style={{ width: `${(s.value / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent Activity
        </h2>
        <div className="mt-4">
          <ActivityFeed activities={data.activities} />
        </div>
      </div>
    </div>
  );
}

export function StudyStatusSection({ data }: { data: StudyStatusSectionProps }) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 rounded bg-white/[0.06]" />
                <div className="h-6 w-12 rounded bg-white/[0.06]" />
                <div className="h-2 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-white/[0.06]" />
                  <div className="h-2 w-20 rounded bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    }>
      <StudyStatusSectionContent data={data} />
    </Suspense>
  );
}

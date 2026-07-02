"use client";

import { User, Calendar, Layers, Activity, Crown, Monitor, Server } from "lucide-react";

type Series = {
  id: string;
  seriesUid: string;
  modality?: string | null;
  instanceCount: number;
  equipment?: {
    manufacturer?: string | null;
    manufacturerModelName?: string | null;
    stationName?: string | null;
    institutionName?: string | null;
    institutionalDepartmentName?: string | null;
    deviceSerialNumber?: string | null;
    softwareVersions?: string | null;
  };
};

export function MetadataPanel({
  patientName,
  studyDate,
  description,
  series,
  plan = "starter",
  activeSeriesIndex = 0,
}: {
  patientName?: string | null;
  studyDate?: string | null;
  description?: string | null;
  series: Series[];
  plan?: "starter" | "pro" | "enterprise";
  activeSeriesIndex?: number;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/40 via-emerald-400/10 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {patientName ?? "Unknown"}
            </div>
            <div className="text-[11px] text-slate-500">Patient</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Calendar className="h-3 w-3" />
              Study Date
            </div>
            <div className="mt-0.5 text-xs font-medium text-white truncate">
              {studyDate ?? "-"}
            </div>
          </div>
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Layers className="h-3 w-3" />
              Series
            </div>
            <div className="mt-0.5 text-xs font-medium text-white">
              {series.length}
            </div>
          </div>
        </div>

        {description && (
          <div className="mt-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Description
            </div>
            <div className="mt-1 text-xs text-slate-400 leading-relaxed">
              {description}
            </div>
          </div>
        )}

        {series[activeSeriesIndex]?.equipment && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Equipment
            </div>
            <div className="mt-2 space-y-1.5">
              {(() => {
                const eq = series[activeSeriesIndex]?.equipment;
                if (!eq) return null;
                const items: [string, string | undefined | null][] = [
                  ["Manufacturer", eq.manufacturer],
                  ["Model", eq.manufacturerModelName],
                  ["Station", eq.stationName],
                  ["Institution", eq.institutionName],
                  ["Department", eq.institutionalDepartmentName],
                  ["Serial", eq.deviceSerialNumber],
                  ["Software", eq.softwareVersions],
                ];
                return items
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="flex items-center gap-2 rounded-md bg-white/[0.02] px-2.5 py-1.5">
                      <Server className="h-3 w-3 shrink-0 text-slate-600" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[10px] text-slate-400">{value}</div>
                        <div className="text-[8px] text-slate-600">{label}</div>
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400/40 via-sky-400/10 to-transparent" />
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Series List
        </div>
        <div className="mt-3 space-y-2">
          {series.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-md border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:shadow-sm">
                <div className="pointer-events-none absolute top-0 left-0 h-full w-0.5 bg-gradient-to-b from-emerald-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {item.modality ?? "MR"}
                </span>
                <span className="text-[10px] text-slate-600 tabular-nums">
                  {item.instanceCount} images
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-600 font-mono truncate">
                {item.seriesUid.slice(0, 28)}&hellip;
              </div>
            </div>
          ))}
        </div>
      </div>

      {plan === "pro" || plan === "enterprise" ? (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            AI Insights
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/15 bg-emerald-500/5 p-3">
              <Activity className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
              <div>
                <div className="text-[11px] font-medium text-emerald-400">No critical findings</div>
                <div className="text-[10px] text-emerald-400/60">AI confidence: 98%</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <a
          href="/services/pricing"
          className="block rounded-lg border border-amber-500/15 bg-amber-500/[0.03] p-4 transition-colors hover:bg-amber-500/[0.06]"
        >
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400">AI Insights</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
            Upgrade to Pro or Enterprise to unlock AI-powered findings and priority analysis.
          </p>
        </a>
      )}


    </div>
  );
}

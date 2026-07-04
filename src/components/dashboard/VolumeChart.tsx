"use client";

import { BarChart3, Clock } from "lucide-react";
import type { VolumeEntry } from "@/lib/dashboard";

export function VolumeChart({ data, avgTurnaroundHours }: { data: VolumeEntry[]; avgTurnaroundHours: number | null }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = total > 0 ? Math.round(total / data.length) : 0;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      <div className="lg:col-span-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Study Volume
          </h2>
          <span className="ml-auto text-[10px] text-slate-600 tabular-nums">
            {total} studies · avg {avg}/day
          </span>
        </div>
        <div className="flex items-end gap-[1px] h-24">
          {data.map((d) => {
            const pct = (d.count / max) * 100;
            const day = new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            return (
              <div
                key={d.date}
                className="group relative flex flex-1 items-end justify-center"
                title={`${day}: ${d.count} study${d.count === 1 ? "" : "ies"}`}
              >
                <div
                  className="w-full rounded-t-sm bg-emerald-500/40 transition-all hover:bg-emerald-400/60 min-h-[2px]"
                  style={{ height: `${Math.max(pct, 1)}%` }}
                />
                {data.length <= 31 && (
                  <span className="absolute -bottom-4 text-[6px] text-slate-700 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-slate-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Turnaround
          </h2>
        </div>
        {avgTurnaroundHours !== null ? (
          <>
            <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">
              {avgTurnaroundHours < 1 ? "<1" : avgTurnaroundHours}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              hours avg from upload to report
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-600 py-4">No completed reports yet</p>
        )}
      </div>
    </div>
  );
}

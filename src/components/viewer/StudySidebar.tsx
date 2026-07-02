"use client";

import { useState } from "react";
import { SeriesThumbnail } from "./SeriesThumbnail";

type Series = {
  id: string;
  seriesUid: string;
  modality?: string | null;
  instanceCount: number;
  firstImageId?: string | null;
};

export function StudySidebar({
  studyUid,
  patientName,
  series,
  imageIds,
  activeSeriesIndex,
  onSeriesClick,
}: {
  studyUid: string;
  patientName?: string | null;
  series: Series[];
  imageIds: string[];
  activeSeriesIndex: number;
  onSeriesClick: (index: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = series
    .map((s, i) => ({ ...s, index: i }))
    .filter(
      (s) =>
        !search ||
        s.modality?.toLowerCase().includes(search.toLowerCase())
    );

  const modalityColor = (mod?: string | null) => {
    switch (mod?.toUpperCase()) {
      case "CT": return "border-cyan-500/40 bg-cyan-500/10 text-cyan-400";
      case "MR": case "MRI": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
      case "XR": case "DX": return "border-amber-500/40 bg-amber-500/10 text-amber-400";
      case "US": return "border-purple-500/40 bg-purple-500/10 text-purple-400";
      case "PT": case "PET": return "border-rose-500/40 bg-rose-500/10 text-rose-400";
      case "NM": return "border-orange-500/40 bg-orange-500/10 text-orange-400";
      default: return "border-slate-500/40 bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none"
          placeholder="Filter series..."
        />
      </div>

      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {patientName ?? "Study"}
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {filtered.map((s) => {
          const firstImageId =
            s.firstImageId ?? imageIds[0] ?? "";

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSeriesClick(s.index)}
              className={`w-full rounded-lg border p-2.5 text-left transition-all hover:shadow-sm ${
                s.index === activeSeriesIndex
                  ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-emerald-500/5"
                  : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1] hover:bg-white/[0.06]"
              }`}
            >
              {firstImageId && (
                <div className="mb-2">
                  <SeriesThumbnail imageId={firstImageId} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${modalityColor(s.modality)}`}
                >
                  {s.modality || "SC"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {s.instanceCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

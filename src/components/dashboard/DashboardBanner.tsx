"use client";

import { useState } from "react";
import { BarChart3, AlertTriangle, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const UpgradeModal = dynamic(() => import("@/components/UpgradeModal").then((m) => ({ default: m.UpgradeModal })), { ssr: false });

export function DashboardBanner({
  used,
  limit,
  usagePercent,
}: {
  used: number;
  limit: number;
  usagePercent: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const isCritical = usagePercent > 90;

  return (
    <>
      <div className={`relative mb-6 overflow-hidden rounded-xl border px-5 py-3.5 ${
        isCritical
          ? "border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-500/[0.02]"
          : "border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-amber-500/[0.02]"
      }`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isCritical ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
            }`}>
              {isCritical ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <div className={`text-xs font-semibold ${
                isCritical ? "text-red-300" : "text-amber-300"
              }`}>
                {isCritical ? "Study limit critical" : "Study limit running low"}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                <span>{used} / {limit} studies used</span>
                <span className="text-white/[0.06]">|</span>
                <span className={`tabular-nums ${isCritical ? "text-red-400" : "text-amber-400"}`}>{usagePercent}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06] shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical
                    ? "bg-gradient-to-r from-red-500 to-red-400"
                    : "bg-gradient-to-r from-amber-500 to-amber-400"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-1.5 text-[10px] font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-95"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
      <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} currentPlan="starter" />
    </>
  );
}

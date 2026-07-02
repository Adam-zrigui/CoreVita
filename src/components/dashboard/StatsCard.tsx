import { memo, type ReactNode } from "react";

export const StatsCard = memo(function StatsCard({
  icon,
  label,
  value,
  trend,
  gradient,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  trend?: { direction: "up" | "down"; label: string };
  gradient?: "emerald" | "sky" | "violet" | "amber";
}) {
  const gradientMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5",
    sky: "from-sky-500/20 to-sky-500/5",
    violet: "from-violet-500/20 to-violet-500/5",
    amber: "from-amber-500/20 to-amber-500/5",
  };
  const iconBg = {
    emerald: "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/5",
    sky: "bg-sky-500/10 text-sky-400 shadow-sky-500/5",
    violet: "bg-violet-500/10 text-violet-400 shadow-violet-500/5",
    amber: "bg-amber-500/10 text-amber-400 shadow-amber-500/5",
  };
  const g = gradient ?? "emerald";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-200 hover:border-emerald-500/20 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-1 ring-emerald-500/15 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -inset-x-20 -inset-y-10 rounded-full bg-gradient-to-r from-transparent via-emerald-500/[0.02] to-transparent opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg[g] ?? iconBg.emerald}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="mt-0.5 text-2xl font-semibold tracking-tight text-white tabular-nums">
            {value}
          </div>
          {trend && (
            <div
              className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                trend.direction === "up"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              <span>{trend.direction === "up" ? "\u2191" : "\u2193"}</span>
              {trend.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

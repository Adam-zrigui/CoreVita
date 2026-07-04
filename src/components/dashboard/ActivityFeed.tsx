"use client";

import { Clock, FileText, Activity as ActivityIcon } from "lucide-react";

export type Activity = {
  id: string;
  type: "study_created" | "report_created";
  description: string;
  timestamp: string;
};

function formatRelativeTime(iso: string, now: number = Date.now()) {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({
  activities,
}: {
  activities?: Activity[];
}) {
  const items = activities ?? [];

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-slate-600">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400/70">
            {a.type === "study_created" ? (
              <ActivityIcon className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-slate-300">
              {a.description}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(a.timestamp, new Date(items[0].timestamp).getTime())}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

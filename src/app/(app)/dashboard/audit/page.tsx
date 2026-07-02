"use client";

import { useEffect, useState } from "react";
import {
  Shield, Clock, User, ChevronRight, AlertCircle,
  UserPlus, UserMinus, UserCog, Upload, Trash2, Link, Link2Off,
  FileText, Sparkles, Settings2, LogIn,
} from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string | null };
};

const ACTION_LABELS: Record<string, string> = {
  "member.invite": "Member Invited",
  "member.remove": "Member Removed",
  "member.role_change": "Role Changed",
  "study.upload": "Study Uploaded",
  "study.delete": "Study Deleted",
  "share.create": "Share Link Created",
  "share.revoke": "Share Link Revoked",
  "report.create": "Report Created",
  "report.ai": "AI Report Generated",
  "team.settings": "Organization Updated",
  login: "User Logged In",
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  "member.invite": UserPlus,
  "member.remove": UserMinus,
  "member.role_change": UserCog,
  "study.upload": Upload,
  "study.delete": Trash2,
  "share.create": Link,
  "share.revoke": Link2Off,
  "report.create": FileText,
  "report.ai": Sparkles,
  "team.settings": Settings2,
  login: LogIn,
};

const ACTION_COLORS: Record<string, string> = {
  "member.invite": "text-emerald-400",
  "member.remove": "text-red-400",
  "member.role_change": "text-blue-400",
  "study.upload": "text-amber-400",
  "study.delete": "text-red-400",
  "share.create": "text-violet-400",
  "share.revoke": "text-rose-400",
  "report.create": "text-emerald-400",
  "report.ai": "text-purple-400",
  "team.settings": "text-cyan-400",
  login: "text-sky-400",
};

const ACTION_BG: Record<string, string> = {
  "member.invite": "bg-emerald-500/10",
  "member.remove": "bg-red-500/10",
  "member.role_change": "bg-blue-500/10",
  "study.upload": "bg-amber-500/10",
  "study.delete": "bg-red-500/10",
  "share.create": "bg-violet-500/10",
  "share.revoke": "bg-rose-500/10",
  "report.create": "bg-emerald-500/10",
  "report.ai": "bg-purple-500/10",
  "team.settings": "bg-cyan-500/10",
  login: "bg-sky-500/10",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.set("action", actionFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        const qs = params.toString();
        const res = await fetch(`/api/audit${qs ? `?${qs}` : ""}`);
        if (mounted) {
          if (res.ok) {
            setEntries(await res.json());
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Failed to load audit log");
          }
        }
      } catch {
        if (mounted) setError("Network error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [actionFilter, dateFrom, dateTo]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-semibold tracking-tight text-white">Audit Log</h1>
          {!loading && (
            <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-500 tabular-nums">
              {entries.length}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">Track changes and actions across your organization</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-2.5">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-500/40"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-500/40 [color-scheme:dark]"
          />
          <span className="self-center text-[10px] text-slate-600">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-500/40 [color-scheme:dark]"
          />
          {(actionFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setActionFilter(""); setDateFrom(""); setDateTo(""); }}
              className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-slate-400 transition-all hover:bg-white/[0.1] active:scale-95"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm font-medium text-red-300">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-6 py-20 text-center">
          <Shield className="h-8 w-8 text-slate-600" />
          <h3 className="mt-4 text-sm font-semibold text-white">No audit entries yet</h3>
          <p className="mt-1 text-xs text-slate-500">Actions performed by team members will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const ActionIcon = ACTION_ICONS[entry.action] ?? Shield;
            const actionColor = ACTION_COLORS[entry.action] ?? "text-slate-300";
            const actionBg = ACTION_BG[entry.action] ?? "bg-slate-500/10";
            return (
              <div
                key={entry.id}
                className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:bg-white/[0.04] hover:border-white/[0.09] hover:shadow-[0_0_20px_-8px] hover:shadow-emerald-500/5"
              >
                {/* Timeline connector */}
                {idx < entries.length - 1 && (
                  <div className="absolute left-[26px] top-12 bottom-0 w-px bg-white/[0.04]" />
                )}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${actionBg} shadow-sm ring-1 ring-white/[0.04] z-10`}>
                  <ActionIcon className={`h-4 w-4 ${actionColor}`} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {entry.actor.name ?? entry.actor.email ?? "Unknown"}
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-700" />
                    <span className="text-sm text-slate-300">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </div>
                  {entry.metadata && (
                    <div className="mt-0.5 text-[11px] text-slate-600 font-mono truncate">
                      {JSON.stringify(entry.metadata)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-600 pt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

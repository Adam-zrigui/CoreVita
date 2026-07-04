"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowUpRight, Loader2 } from "lucide-react";

type ReportItem = {
  id: string;
  status: string;
  content: string | null;
  createdAt: string;
  author: { name: string | null } | null;
  study: { id: string; patientName: string | null; title?: string | null; studyUid: string | null };
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    fetch("/api/reports")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
        return res.json();
      })
      .then((data) => { if (mounted) setReports(data.reports ?? data); })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = statusFilter === "all"
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-sky-500/10 ring-1 ring-white/[0.06]">
          <FileText className="h-6 w-6 text-emerald-400" />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight text-white">Reports</h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          All reports across your studies
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        {["all", "DRAFT", "FINAL"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
              statusFilter === s
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] px-5 py-8 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-16">
          <FileText className="mb-3 h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-600">
            {reports.length === 0 ? "No reports yet" : "No reports match the filter"}
          </p>
          {reports.length === 0 && (
            <p className="mt-1 text-xs text-slate-600">
              Reports appear here when you create them from a study.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <Link
              key={report.id}
              href={`/studies/${report.study.id}`}
              className="group relative flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                report.status === "FINAL"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    report.status === "FINAL"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}>
                    <span className={`h-1 w-1 rounded-full ${
                      report.status === "FINAL" ? "bg-emerald-400" : "bg-amber-400"
                    }`} />
                    {report.status}
                  </span>
                  <span className="truncate text-sm font-medium text-white">
                    {report.study.title ?? report.study.patientName ?? "Unknown patient"}
                  </span>
                </div>
                {report.content && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
                    {report.content}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-600">
                  <span>{report.author?.name || "Unknown"}</span>
                  <span className="text-white/[0.04]">·</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

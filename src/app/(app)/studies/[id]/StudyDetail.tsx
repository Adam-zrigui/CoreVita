"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  Share2,
  User,
  Clock,
  Activity,
  FileText,
  Layers,
  Calendar,
  Info,
  XCircle,
  Sparkles,
  Loader2,
  CalendarPlus,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
import { DeleteStudyButton } from "@/components/studies/DeleteStudyButton";

const ShareModal = dynamic(() => import("@/components/share/ShareModal").then((m) => ({ default: m.ShareModal })), { ssr: false });

interface SeriesItem {
  id: string;
  seriesUid: string;
  modality: string | null;
  instanceCount: number;
  seriesNumber: number | null;
  _count: { instances: number };
}

interface ReportItem {
  id: string;
  status: string;
  content: string | null;
  createdAt: Date;
  author: { name: string | null } | null;
}

interface ShareTokenItem {
  id: string;
  token: string;
  expiresAt: Date;
  password: string | null;
  allowDownload: boolean;
  createdAt: Date;
}

interface StudyData {
  id: string;
  studyUid: string;
  patientName: string | null;
  title?: string | null;
  patientId: string | null;
  modality: string | null;
  studyDate: string | null;
  slices: number;
  status: string;
  description: string | null;
  createdAt: Date;
  series: SeriesItem[];
  reports: ReportItem[];
  shareTokens: ShareTokenItem[];
}

export function StudyDetail({ study, plan, hasAiFeature, hasStructuredReports }: { study: StudyData; plan: string; hasAiFeature: boolean; hasStructuredReports: boolean }) {
  const [showShare, setShowShare] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [extending, setExtending] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [tokens, setTokens] = useState(study.shareTokens);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");
  const router = useRouter();

  const canExtend = plan === "pro" || plan === "enterprise";

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const generateAiReport = useCallback(async () => {
    setGeneratingAi(true);
    setAiError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyId: study.id, ai: true }),
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate AI report");
      }
      router.refresh();
    } catch (err: any) {
      if (mountedRef.current) setAiError(err.message);
    } finally {
      if (mountedRef.current) setGeneratingAi(false);
    }
  }, [study.id, router]);

  const extendToken = useCallback(async (token: string) => {
    setExtending(token);
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: extendDays }),
      });
      if (!mountedRef.current) return;
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extend");
      }
      const data = await res.json();
      setTokens((prev) =>
        prev.map((t) =>
          t.token === token ? { ...t, expiresAt: new Date(data.expiresAt) } : t
        )
      );
      toast.success("Share link extended");
    } catch (err) {
      if (mountedRef.current) toast.error(err instanceof Error ? err.message : "Failed to extend share link");
    } finally {
      if (mountedRef.current) setExtending(null);
    }
  }, [extendDays]);

  const revokeToken = useCallback(async (token: string) => {
    if (!confirm("Revoke this share link? Users with this link will lose access immediately.")) return;
    setRevoking(token);
    try {
      const res = await fetch(`/api/share/${token}`, { method: "DELETE" });
      if (!mountedRef.current) return;
      if (!res.ok) throw new Error("Failed to revoke");
      setTokens((prev) => prev.filter((t) => t.token !== token));
      toast.success("Share link revoked");
    } catch (err) {
      if (mountedRef.current) toast.error(err instanceof Error ? err.message : "Failed to revoke share link");
    } finally {
      if (mountedRef.current) setRevoking(null);
    }
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "border-amber-500/20 bg-amber-500/8 text-amber-400";
      case "READING": return "border-blue-500/20 bg-blue-500/8 text-blue-400";
      case "REPORTED": return "border-emerald-500/20 bg-emerald-500/8 text-emerald-400";
      default: return "border-slate-500/20 bg-slate-500/8 text-slate-400";
    }
  };

  const totalInstances = study.series.reduce((sum, s) => sum + s._count.instances, 0);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8 animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/studies"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All studies
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            {/* Gradient top accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold tracking-tight text-white truncate">
                    {study.title ?? study.patientName ?? "Unknown Patient"}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor(study.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      study.status === "PENDING" ? "bg-amber-400" :
                      study.status === "READING" ? "bg-blue-400" :
                      study.status === "REPORTED" ? "bg-emerald-400" : "bg-slate-400"
                    }`} />
                    {study.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  {study.patientId && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-600" />
                      Patient ID: {study.patientId}
                    </span>
                  )}
                  {study.modality && (
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-slate-600" />
                      Modality: {study.modality}
                    </span>
                  )}
                  {study.studyDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-600" />
                      Study date: {study.studyDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    Uploaded {new Date(study.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                  <span>{study.series.length} series</span>
                  <span>{totalInstances} images</span>
                  <span>{study.slices} slices</span>
                </div>
              </div>
            </div>

            {study.description && (
              <div className="mt-4 rounded-lg bg-white/[0.03] px-4 py-3 border border-white/[0.04]">
                <p className="text-sm text-slate-400">{study.description}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/viewer/${study.studyUid}`}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-400 active:scale-[0.98]"
              >
                <Eye className="h-4 w-4" />
                Open Viewer
              </Link>
              <button
                onClick={() => setShowShare(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08] active:scale-[0.98]"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              {study.patientId && (
                <Link
                  href={`/patients/${encodeURIComponent(study.patientId)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <User className="h-4 w-4" />
                  Patient
                </Link>
              )}
              <DeleteStudyButton studyUid={study.studyUid} />
            </div>
          </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Layers className="h-4 w-4 text-slate-500" />
          Series ({study.series.length})
        </h2>
        <div className="mt-4 space-y-2">
          {study.series.length === 0 ? (
            <p className="text-sm text-slate-600">No series found</p>
          ) : (
            study.series.map((series, i) => (
              <div
                key={series.id}
                className="group relative flex items-center justify-between overflow-hidden rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-3 transition-all hover:bg-white/[0.03] hover:border-white/[0.08]"
              >
                <div className={`absolute left-0 top-0 h-full w-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${
                  series.modality === "MR" ? "bg-gradient-to-b from-sky-400 to-sky-600" :
                  series.modality === "CT" ? "bg-gradient-to-b from-blue-400 to-blue-600" :
                  "bg-gradient-to-b from-emerald-400 to-emerald-600"
                }`} />
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-mono text-slate-500 transition-colors group-hover:bg-white/[0.07]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                      {series.modality || "Series"} {series.seriesNumber ? `#${series.seriesNumber}` : ""}
                    </p>
                    <p className="text-xs text-slate-600">
                      {series._count.instances} image{series._count.instances !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-mono text-slate-500 transition-colors group-hover:bg-white/[0.07]">
                  {series.modality || "N/A"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
        </div>

        <div className="space-y-6">
          {tokens.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400/60 via-violet-400/20 to-transparent" />
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Share2 className="h-4 w-4 text-violet-500" />
                  Shared Links
                </h2>
                <span className="text-[10px] text-slate-600">{tokens.length} link{tokens.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="mt-3 space-y-2">
                {tokens.map((st) => (
                  <div key={st.id} className="group rounded-lg border border-white/[0.04] bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/[0.08]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-400 font-mono flex-1">
                        /share/{st.token.slice(0, 8)}...
                      </p>
                      <div className="flex items-center gap-1">
                        {canExtend && (
                          <button
                            onClick={() => { setExtendDays(7); setExtending(extending === st.token ? null : st.token); }}
                            className="rounded p-1 text-slate-600 hover:text-blue-400 transition-all hover:bg-blue-500/10 active:scale-90"
                            title="Extend expiry"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => revokeToken(st.token)}
                          disabled={revoking === st.token}
                          className="rounded p-1 text-slate-600 hover:text-red-400 transition-all hover:bg-red-500/10 active:scale-90 disabled:opacity-30"
                          title="Revoke share link"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-600">
                      <span>Expires {new Date(st.expiresAt).toLocaleDateString()}</span>
                      {st.password && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-400">Protected</span>
                      )}
                      {st.allowDownload && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400">Download</span>
                      )}
                    </div>
                    {extending === st.token && (
                      <div className="mt-2 flex items-center gap-2 border-t border-white/[0.04] pt-2">
                        <select
                          value={extendDays}
                          onChange={(e) => setExtendDays(Number(e.target.value))}
                          disabled={extending !== null}
                          className="flex-1 rounded border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[10px] text-white outline-none disabled:opacity-40"
                        >
                          <option value={7}>7 days</option>
                          <option value={14}>14 days</option>
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                          <option value={365}>1 year</option>
                        </select>
                        <button
                          onClick={() => extendToken(st.token)}
                          disabled={extending === st.token}
                          className="flex items-center gap-1 rounded bg-gradient-to-r from-blue-600 to-blue-500 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm transition-all hover:from-blue-500 hover:to-blue-400 active:scale-95 disabled:opacity-50"
                        >
                          {extending === st.token ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Extend
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(study.reports.length > 0 || hasAiFeature || hasStructuredReports) && (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  Reports
                </h2>
                <div className="flex items-center gap-2">
                  {hasAiFeature && (
                    <button
                      onClick={generateAiReport}
                      disabled={generatingAi}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600/20 to-violet-500/10 px-3 py-1.5 text-[10px] font-medium text-violet-400 transition-all hover:from-violet-500/20 hover:to-violet-400/20 active:scale-95 disabled:opacity-40"
                    >
                      {generatingAi ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Report
                    </button>
                  )}
                  {!hasAiFeature && !hasStructuredReports && (
                    <Link
                      href="/services/pricing"
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600/20 to-amber-500/10 px-3 py-1.5 text-[10px] font-medium text-amber-400 transition-all hover:from-amber-500/20 hover:to-amber-400/20 active:scale-95"
                    >
                      Upgrade to Pro
                    </Link>
                  )}
                </div>
              </div>
              {aiError && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[10px] text-red-400">{aiError}</div>
              )}
              {study.reports.length > 0 && (
                <div className="mt-3 space-y-3">
                  {study.reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="group rounded-lg border border-white/[0.04] bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/[0.08]">
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
                        <span className="text-xs text-slate-600">
                          {report.author?.name || "Unknown"}
                        </span>
                      </div>
                      {report.content && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-400 leading-relaxed">{report.content}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-600">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {study.reports.length === 0 && hasAiFeature && (
                <div className="mt-3 flex flex-col items-center rounded-lg bg-white/[0.02] py-6 text-center">
                  <Sparkles className="h-5 w-5 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-600">No reports yet. Click "AI Report" to generate one.</p>
                </div>
              )}
              {study.reports.length === 0 && !hasAiFeature && hasStructuredReports && (
                <div className="mt-3 flex flex-col items-center rounded-lg bg-white/[0.02] py-6 text-center">
                  <FileText className="h-5 w-5 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-600">No reports yet. Create one from the study viewer.</p>
                </div>
              )}
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400/60 via-sky-400/20 to-transparent" />
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Info className="h-4 w-4 text-sky-500" />
              Study Info
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <dt className="text-slate-500 text-xs">Study UID</dt>
                <dd className="text-slate-300 font-mono text-xs truncate ml-4 max-w-[180px]">{study.studyUid}</dd>
              </div>
              <div className="flex justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <dt className="text-slate-500 text-xs">Tenant</dt>
                <dd className="text-slate-300 text-xs">Default</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {showShare && (
        <ShareModal
          studyId={study.id}
          studyUid={study.studyUid}
          plan={plan === "enterprise" ? "enterprise" : plan === "pro" ? "pro" : "starter"}
          onClose={() => setShowShare(false)}
          onShare={() => router.refresh()}
        />
      )}
    </main>
  );
}

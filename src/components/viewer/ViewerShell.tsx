"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerstoneViewport } from "@/components/viewer/CornerstoneViewport";
import { MedicalToolbar } from "@/components/viewer/MedicalToolbar";
import { StudySidebar } from "@/components/viewer/StudySidebar";
import { MetadataPanel } from "@/components/viewer/MetadataPanel";
import { StatusBar } from "@/components/viewer/StatusBar";
import { ToolDock } from "@/components/viewer/ToolDock";
import { KeyboardOverlay } from "@/components/viewer/KeyboardOverlay";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const ReportModal = dynamic(() => import("@/components/viewer/ReportModal").then((m) => ({ default: m.ReportModal })), { ssr: false });
import type { Types } from "@cornerstonejs/core";
import JSZip from "jszip";
import { generatePdfReport } from "@/lib/generateReport";
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, Key, Code, X, Copy, Check, Loader2 } from "lucide-react";

type Series = {
  id: string;
  seriesUid: string;
  modality?: string | null;
  instanceCount: number;
  firstImageId?: string | null;
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

export function ViewerShell({
  study,
  imageIds,
  total,
  plan = "starter",
  backHref,
  headerExtra,
  onDownload,
  apiKey,
}: {
  study: {
    studyUid: string;
    patientName?: string | null;
    title?: string | null;
    studyDate?: string | null;
    description?: string | null;
    status?: string;
    series: Series[];
  };
  imageIds: string[];
  total: number;
  plan?: "starter" | "pro" | "enterprise";
  backHref?: string;
  headerExtra?: React.ReactNode;
  onDownload?: () => void;
  apiKey?: string;
}) {
  const [activeTool, setActiveTool] = useState("wl");
  const [sliceIndex, setSliceIndex] = useState(0);
  const [cinePlaying, setCinePlaying] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const canReport = plan !== "starter";
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [studyStatus, setStudyStatus] = useState(study.status ?? "PENDING");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [viewport, setViewport] = useState<Types.IStackViewport | null>(null);
  const viewportRef = useRef<Types.IStackViewport | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const maxSlice = Math.max(total - 1, 0);

  const activeSeriesIndex = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < study.series.length; i++) {
      acc += study.series[i]?.instanceCount ?? 0;
      if (sliceIndex < acc) return i;
    }
    return 0;
  }, [study.series, sliceIndex]);

  const goToSlice = useCallback((nextIndex: number) => {
    setCinePlaying(false);
    setSliceIndex(Math.min(Math.max(nextIndex, 0), maxSlice));
  }, [maxSlice]);

  const exportSnapshot = useCallback(() => {
    const el = elementRef.current;
    const canvas = el?.querySelector("canvas");
    if (!canvas) { toast.error("Export not available"); return; }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `corevita-${study.studyUid}-slice-${sliceIndex + 1}.png`;
    link.click();
    toast.success("Snapshot exported");
  }, [sliceIndex, study.studyUid]);

  const downloadDicom = useCallback(() => {
    (async () => {
      const zip = new JSZip();
      let downloaded = 0;
      for (const raw of imageIds) {
        try {
          const withoutPrefix = raw.replace(/^wadouri:/, "");
          const url = new URL(withoutPrefix, "http://localhost");
          const id = url.pathname.split("/").filter(Boolean).pop();
          if (!id) continue;

          const token = url.searchParams.get("token");
          const downloadUrl = token
            ? `/api/dicom/instance/${id}?token=${token}&download=1`
            : `/api/dicom/instance/${id}?download=1`;

          const res = await fetch(downloadUrl);
          if (!res.ok) continue;
          const blob = await res.blob();
          zip.file(id, blob);
          downloaded++;
        } catch {
          // skip failed downloads
        }
      }
      if (downloaded === 0) {
        toast.error("Failed to download any DICOM files");
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `corevita-${study.studyUid}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${downloaded} DICOM file${downloaded === 1 ? "" : "s"}`);
    })();
  }, [imageIds, study.studyUid]);

  const exportPdf = useCallback(async () => {
    const el = elementRef.current;
    const canvas = el?.querySelector("canvas");
    if (!canvas) { toast.error("PDF export not available"); return; }
    try {
      const doc = await generatePdfReport(study, canvas, plan);
      doc.save(`corevita-report-${study.studyUid.slice(0, 12)}.pdf`);
      toast.success("Report exported as PDF");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }, [study, plan]);

  const snapshotRef = useRef(exportSnapshot);
  const goToSliceRef = useRef(goToSlice);
  const sliceIndexRef = useRef(sliceIndex);
  const reportOpenRef = useRef(reportOpen);
  snapshotRef.current = exportSnapshot;
  goToSliceRef.current = goToSlice;
  sliceIndexRef.current = sliceIndex;
  reportOpenRef.current = reportOpen;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (reportOpenRef.current) return;
      if (e.key === "1") setActiveTool("wl");
      if (e.key === "2") setActiveTool("pan");
      if (e.key === "3") setActiveTool("zoom");
      if (e.key === "4") setActiveTool("measure");
      if (e.key === "5") setActiveTool("annotate");
      if (e.key === " ") { e.preventDefault(); setCinePlaying((v) => !v); }
      if (e.key === "f" || e.key === "F") {
        const el = elementRef.current;
        if (el && document.fullscreenElement !== el) {
          el.requestFullscreen().catch((e) => console.warn("[viewer] fullscreen failed:", e));
        } else {
          document.exitFullscreen?.();
        }
      }
      if (e.key === "e" || e.key === "E") snapshotRef.current();
      if ((e.key === "r" || e.key === "R") && canReport) setReportOpen((v) => !v);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goToSliceRef.current(sliceIndexRef.current + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goToSliceRef.current(sliceIndexRef.current - 1);
      }
      if (e.key === "Escape") { setActiveTool("wl"); setCinePlaying(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canReport]);

  const handleViewportReady = useCallback((vp: Types.IStackViewport) => {
    viewportRef.current = vp;
    setViewport(vp);
  }, []);

  const handleElementReady = useCallback((el: HTMLDivElement) => {
    elementRef.current = el;
  }, []);

  const canChangeStatus = plan === "pro" || plan === "enterprise";

  const statusCycle: Record<string, string> = {
    PENDING: "READING",
    READING: "REPORTED",
    REPORTED: "REPORTED",
  };

  const handleStatusChange = useCallback(async () => {
    if (!canChangeStatus || updatingStatus) return;
    const next = statusCycle[studyStatus];
    if (!next || next === studyStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/studies/${study.studyUid}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      setStudyStatus(next);
      toast.success(`Status changed to ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }, [studyStatus, canChangeStatus, updatingStatus, study.studyUid]);

  const handleToolbarAction = useCallback((action: string) => {
    if (action === "download") {
      if (onDownload) { onDownload(); return; }
      downloadDicom();
      return;
    }
    if (action === "export") { exportSnapshot(); return; }
    if (action === "pdf") { exportPdf(); return; }
    if (action === "report") {
      if (!canReport) { toast.error("Reports require the Pro plan"); return; }
      setReportOpen(true);
      return;
    }
    const viewport = viewportRef.current;
    if (action === "fullscreen") {
      const el = elementRef.current;
      if (el && document.fullscreenElement !== el) {
        el.requestFullscreen().catch(() => toast.error("Fullscreen failed"));
      } else {
        document.exitFullscreen?.();
      }
      return;
    }
    if (action === "zoomIn" && viewport) {
      viewport.setZoom(viewport.getZoom() * 1.15);
      viewport.render();
      return;
    }
    if (action === "zoomOut" && viewport) {
      viewport.setZoom(viewport.getZoom() * 0.85);
      viewport.render();
      return;
    }
    if (action === "invert" && viewport) {
      const props = viewport.getProperties();
      viewport.setProperties({ invert: !props.invert });
      viewport.render();
      return;
    }
    if (action === "reset" && viewport) {
      viewport.resetProperties();
      viewport.resetCamera();
      viewport.render();
      goToSlice(0);
      return;
    }
  }, [canReport, downloadDicom, exportSnapshot, goToSlice]);

  return (
    <main className="relative mx-auto flex min-h-screen flex-col">
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-0.5 bg-gradient-to-r from-emerald-400/40 via-sky-400/20 to-transparent" />
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-4">
          <a
            href={backHref ?? "/dashboard"}
            className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </a>
          <div>
            <h1 className="text-sm font-semibold text-white">
              {study.title ?? study.patientName ?? "Unknown"}
            </h1>
            <div className="text-[11px] text-slate-600 font-mono">
              {study.studyUid.slice(0, 24)}&hellip;
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStatusChange}
            disabled={!canChangeStatus || updatingStatus}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium tabular-nums transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
              studyStatus === "PENDING"
                ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                : studyStatus === "READING"
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            } ${!canChangeStatus ? "cursor-default" : "cursor-pointer"}`}
            title={canChangeStatus ? "Click to advance status" : "Status"}
          >
            {updatingStatus ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className={`h-1.5 w-1.5 rounded-full ${
                studyStatus === "PENDING" ? "bg-amber-400" :
                studyStatus === "READING" ? "bg-blue-400" : "bg-emerald-400"
              }`} />
            )}
            {studyStatus}
          </button>
          <span className="rounded-md border border-emerald-500/15 bg-emerald-500/[0.04] px-2.5 py-1 text-[11px] font-medium text-emerald-400 tabular-nums">
            {total} images
          </span>
          {headerExtra}
        </div>
      </div>

      <div className="flex flex-1 gap-4 p-5">
        <div className="hidden w-[220px] shrink-0 xl:block">
          <StudySidebar
            studyUid={study.studyUid}
            patientName={study.patientName}
            title={study.title}
            series={study.series}
            imageIds={imageIds}
            activeSeriesIndex={activeSeriesIndex}
            onSeriesClick={(i) => {
              let idx = 0;
              for (let s = 0; s < i; s++) idx += study.series[s]?.instanceCount ?? 0;
              goToSlice(idx);
            }}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <MedicalToolbar onAction={handleToolbarAction} plan={plan} />
            <div className="flex items-center gap-2">
            {plan === "pro" && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 shadow-sm">
                  <Crown className="h-3 w-3" />
                  Pro
                </span>
              )}
              {plan === "enterprise" && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-violet-500/5 px-2.5 py-1 text-[11px] font-medium text-violet-400 shadow-sm">
                  <Crown className="h-3 w-3" />
                  Enterprise
                </span>
              )}
              <KeyboardOverlay />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setShowApiKey(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
                  title="API Access"
                >
                  <Key className="h-3 w-3" />
                  <span className="hidden sm:inline">API</span>
                </button>
              )}
            </div>
          </div>

          <CornerstoneViewport
            imageIds={imageIds}
            activeTool={activeTool}
            onSliceChange={setSliceIndex}
            onViewportReady={handleViewportReady}
            onElementReady={handleElementReady}
            sliceIndex={sliceIndex}
            cinePlaying={cinePlaying}
            patientName={study.patientName}
            title={study.title}
            studyDate={study.studyDate}
            plan={plan}
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => goToSlice(sliceIndex - 1)}
              disabled={sliceIndex <= 0}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-xs font-medium text-slate-400 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] hover:text-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.06] disabled:hover:bg-white/[0.02] disabled:hover:text-slate-400 disabled:active:scale-100"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={maxSlice}
                value={sliceIndex}
                disabled={total <= 1}
                onChange={(e) => goToSlice(Number(e.target.value))}
                aria-label="Slice selector"
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/[0.06] accent-emerald-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/30"
              />
            </div>
            <button
              type="button"
              onClick={() => goToSlice(sliceIndex + 1)}
              disabled={sliceIndex >= maxSlice}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-xs font-medium text-slate-400 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.04] hover:text-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/[0.06] disabled:hover:bg-white/[0.02] disabled:hover:text-slate-400 disabled:active:scale-100"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <ToolDock
              active={activeTool}
              onChange={setActiveTool}
              cinePlaying={cinePlaying}
              onCineToggle={() => setCinePlaying((v) => !v)}
            />
            <StatusBar
              viewport={viewport}
              sliceIndex={sliceIndex}
              total={total}
            />
          </div>
        </div>

        <div className="hidden w-[280px] shrink-0 xl:block">
          <MetadataPanel
            patientName={study.patientName}
            title={study.title}
            studyDate={study.studyDate}
            description={study.description}
            series={study.series}
            plan={plan}
            activeSeriesIndex={activeSeriesIndex}
          />
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        studyId={study.studyUid}
      />

      {showApiKey && apiKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowApiKey(false)}>
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.06] bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowApiKey(false)} aria-label="Close" className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-400">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 shadow-sm ring-1 ring-white/[0.04] mb-4">
              <Code className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">API Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use this token to access the shared study programmatically.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Token</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] font-mono text-slate-300">
                    {apiKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      setApiKeyCopied(true);
                      setTimeout(() => setApiKeyCopied(false), 2000);
                    }}
                    aria-label={apiKeyCopied ? "Copied" : "Copy API key"}
                    className="shrink-0 rounded-lg bg-white/[0.06] p-2 text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-slate-200"
                  >
                    {apiKeyCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Example usage</label>
                <pre className="overflow-x-auto rounded-lg bg-white/[0.03] p-3 text-[11px] font-mono text-slate-400 leading-relaxed">
                  <span className="text-slate-600"># Fetch shared study data</span>{"\n"}
                  curl <span className="text-emerald-400">{typeof window !== "undefined" ? window.location.origin : ""}/api/share/{apiKey}</span>{"\n\n"}
                  <span className="text-slate-600"># Include token header</span>{"\n"}
                  curl -H <span className="text-amber-400">"Authorization: Bearer {apiKey}"</span> {"\n"}
                  &nbsp;&nbsp;&nbsp;{typeof window !== "undefined" ? window.location.origin : ""}/api/share/{apiKey}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

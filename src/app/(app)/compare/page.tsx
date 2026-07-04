"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Link2, Link2Off, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { CornerstoneViewport } from "@/components/viewer/CornerstoneViewport";

type LoadedStudy = {
  study: {
    studyUid: string;
    patientName?: string | null;
    title?: string | null;
    studyDate?: string | null;
  };
  imageIds: string[];
  total: number;
  plan: "starter" | "pro" | "enterprise";
};

function StudyLoader({ studyQuery, onReady }: { studyQuery: string; onReady: (data: LoadedStudy) => void }) {
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/studies/${studyQuery}/viewer`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json() as Promise<LoadedStudy>;
      })
      .then((payload) => { if (!cancelled) onReady(payload); })
      .catch(() => { if (!cancelled) onReady(null as any); });
    return () => { cancelled = true; };
  }, [studyQuery, onReady]);
  return null;
}

function CompareViewport({ data, label, syncIndex, onSliceChange }: {
  data: LoadedStudy;
  label: string;
  syncIndex: number | undefined;
  onSliceChange: (index: number) => void;
}) {
  const [sliceIndex, setSliceIndex] = useState(0);
  const [activeTool, setActiveTool] = useState("wl");

  const effectiveIndex = syncIndex ?? sliceIndex;

  useEffect(() => {
    if (syncIndex !== undefined && syncIndex !== sliceIndex) {
      setSliceIndex(syncIndex);
    }
  }, [syncIndex, sliceIndex]);

  const handleSliceChange = useCallback((index: number) => {
    setSliceIndex(index);
    onSliceChange(index);
  }, [onSliceChange]);

  const maxSlice = Math.max(data.total - 1, 0);

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-[9px] font-semibold text-blue-400">
          {label}
        </div>
        <span className="truncate text-xs font-medium text-slate-300">
          {data.study.title ?? data.study.patientName ?? "Unknown"}
        </span>
        {data.study.studyDate && (
          <span className="text-[10px] text-slate-600">{data.study.studyDate}</span>
        )}
        <span className="ml-auto text-[10px] text-slate-600">{data.total} images</span>
      </div>
      <CornerstoneViewport
        imageIds={data.imageIds}
        activeTool={activeTool}
        onSliceChange={handleSliceChange}
        sliceIndex={effectiveIndex}
        patientName={data.study.patientName}
        title={data.study.title}
        studyDate={data.study.studyDate}
        plan={data.plan}
      />
      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleSliceChange(effectiveIndex - 1)}
          disabled={effectiveIndex <= 0}
          className="flex h-7 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 text-[10px] text-slate-400 transition-all hover:border-emerald-500/20 hover:text-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-[10px] text-slate-500 tabular-nums">
          {effectiveIndex + 1} / {data.total}
        </span>
        <button
          type="button"
          onClick={() => handleSliceChange(effectiveIndex + 1)}
          disabled={effectiveIndex >= maxSlice}
          className="flex h-7 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 text-[10px] text-slate-400 transition-all hover:border-emerald-500/20 hover:text-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const study1 = searchParams.get("study1");
  const study2 = searchParams.get("study2");
  const [data1, setData1] = useState<LoadedStudy | null>(null);
  const [data2, setData2] = useState<LoadedStudy | null>(null);
  const [synced, setSynced] = useState(false);
  const [syncIndex, setSyncIndex] = useState<number | undefined>(undefined);

  const handleReady1 = useCallback((d: LoadedStudy) => setData1(d), []);
  const handleReady2 = useCallback((d: LoadedStudy) => setData2(d), []);

  const handleSliceChangeA = useCallback((index: number) => {
    if (synced) setSyncIndex(index);
  }, [synced]);

  if (!study1 || !study2) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-700 mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Compare Studies</h1>
        <p className="text-sm text-slate-500">
          Select two studies from the{" "}
          <Link href="/studies" className="text-emerald-400 hover:underline">studies page</Link>
          {" "}to compare them side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen flex-col px-4 py-4">
      <StudyLoader studyQuery={study1} onReady={handleReady1} />
      <StudyLoader studyQuery={study2} onReady={handleReady2} />

      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/studies"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Studies
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setSynced((v) => !v); if (synced) setSyncIndex(undefined); }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              synced
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/[0.04] text-slate-500 hover:bg-white/[0.06]"
            }`}
          >
            {synced ? <Link2 className="h-3 w-3" /> : <Link2Off className="h-3 w-3" />}
            {synced ? "Synced" : "Sync off"}
          </button>
        </div>
        <span className="text-[10px] text-slate-600">Study comparison</span>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="flex-1 min-w-0">
          {data1 ? (
            <CompareViewport
              data={data1}
              label="A"
              syncIndex={synced ? (syncIndex ?? 0) : undefined}
              onSliceChange={handleSliceChangeA}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-black py-40">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {data2 ? (
            <CompareViewport
              data={data2}
              label="B"
              syncIndex={synced ? (syncIndex ?? 0) : undefined}
              onSliceChange={() => {}}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-black py-40">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

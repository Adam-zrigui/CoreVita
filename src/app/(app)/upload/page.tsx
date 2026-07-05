"use client";

import { useCallback, useState, useRef } from "react";
import { toast } from "sonner";
import { UploadZone } from "@/components/upload/UploadZone";
import dynamic from "next/dynamic";

const UpgradeModal = dynamic(() => import("@/components/UpgradeModal").then((m) => ({ default: m.UpgradeModal })), { ssr: false });
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  FileWarning,
} from "lucide-react";

type FileStatus = "pending" | "uploading" | "done" | "error";

const DICOM_PREFIX = new Uint8Array([0x44, 0x49, 0x43, 0x4d]);

function looksLikeDicom(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    if (file.name.toUpperCase() === "DICOMDIR") { resolve(true); return; }
    const blob = file.slice(128, 132);
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      resolve(arr.length === 4 && arr[0] === 0x44 && arr[1] === 0x49 && arr[2] === 0x43 && arr[3] === 0x4d);
    };
    reader.onerror = () => resolve(true);
    reader.readAsArrayBuffer(blob);
  });
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [studyUid, setStudyUid] = useState<string | null>(null);
  const [showNonDicomWarning, setShowNonDicomWarning] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [studyTitle, setStudyTitle] = useState("");
  const abortRef = useRef(false);
  const statusMap = useRef<Map<string, FileStatus>>(new Map()).current;
  const [, forceRender] = useState(0);

  const rerender = useCallback(() => forceRender((n) => n + 1), []);

  const setStatus = useCallback(
    (key: string, s: FileStatus) => {
      statusMap.set(key, s);
      rerender();
    },
    [statusMap, rerender],
  );

  const handleFiles = useCallback(
    async (list: File[]) => {
      setStudyUid(null);
      setUploadProgress(0);
      statusMap.clear();
      const valid: File[] = [];
      let hasNonDicom = false;
      for (const f of list) {
        const isDicom = await looksLikeDicom(f);
        if (isDicom) {
          valid.push(f);
        } else {
          hasNonDicom = true;
        }
      }
      setShowNonDicomWarning(hasNonDicom);
      setFiles(valid);
      valid.forEach((f) => statusMap.set(f.name + f.size + f.lastModified, "pending"));
      rerender();
    },
    [statusMap, rerender],
  );

  const removeFile = useCallback(
    (key: string) => {
      setFiles((prev) => prev.filter((f) => f.name + f.size + f.lastModified !== key));
      statusMap.delete(key);
      rerender();
    },
    [statusMap, rerender],
  );

  const cancelUpload = useCallback(() => {
    abortRef.current = true;
    setBusy(false);
    files.forEach((f) => {
      const key = f.name + f.size + f.lastModified;
      if (statusMap.get(key) === "uploading") {
        statusMap.set(key, "pending");
      }
    });
    rerender();
  }, [files, statusMap, rerender]);

  const handleSubmit = async () => {
    if (!files.length) return;

    const presignStart = Date.now();

    const fileInfos = files.map((f) => ({
      name: f.name,
      size: f.size,
      key: f.name + f.size + f.lastModified,
    }));

    // Phase 1: Get presigned URLs
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: fileInfos.map((f) => ({ name: f.name, size: f.size })) }),
    });

    if (!presignRes.ok) {
      const errData = await presignRes.json().catch(() => ({ error: "Failed to get upload URLs" }));
      toast.error(errData.error || "Failed to get upload URLs");
      if (errData.error?.includes("limit") || errData.error?.includes("Upgrade") || errData.error?.includes("upgrade")) {
        setUpgradeModalOpen(true);
      }
      return;
    }

    const { entries, tenantId } = await presignRes.json();
    const presignElapsed = Date.now() - presignStart;

    setBusy(true);
    setUploadProgress(0);
    setStudyUid(null);
    abortRef.current = false;

    files.forEach((f) => statusMap.set(f.name + f.size + f.lastModified, "uploading"));
    rerender();

    // Phase 2: Upload each file directly to B2 using presigned PUT URL
    const totalFiles = fileInfos.length;
    let completedFiles = 0;
    let failedFiles = 0;
    const uploadResults: { name: string; storageKey: string; size: number }[] = [];

    await Promise.all(
      fileInfos.map(async (info, idx) => {
        if (abortRef.current) return;

        const entry = entries[idx];
        const file = files.find((f) => f.name + f.size + f.lastModified === info.key);
        if (!entry || !file) {
          setStatus(info.key, "error");
          failedFiles++;
          return;
        }

        try {
          const xhr = new XMLHttpRequest();
          const result = await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (abortRef.current) {
                xhr.abort();
                reject(new Error("Cancelled"));
                return;
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            });

            xhr.addEventListener("error", () => reject(new Error("Network error")));
            xhr.addEventListener("abort", () => reject(new Error("Cancelled")));

            xhr.open("PUT", entry.uploadUrl);
            xhr.setRequestHeader("Content-Type", "application/dicom");
            xhr.send(file);
          });

          uploadResults.push({ name: info.name, storageKey: entry.storageKey, size: info.size });
          setStatus(info.key, "done");
          completedFiles++;
        } catch (err) {
          if ((err as Error).message === "Cancelled") return;
          setStatus(info.key, "error");
          failedFiles++;
        }

        const done = completedFiles + failedFiles;
        setUploadProgress(Math.round((done / totalFiles) * 100));
      }),
    );

    if (abortRef.current) {
      setBusy(false);
      toast.info("Upload cancelled");
      return;
    }

    // Phase 3: Complete upload — register study in DB
    if (completedFiles > 0) {
      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: uploadResults,
          title: studyTitle.trim() || undefined,
          tenantId,
        }),
      });

      if (completeRes.ok) {
        const data = await completeRes.json();
        const suid = data.studyUid ?? null;
        setStudyUid(suid);
        setUploadProgress(100);
        toast.success("Upload complete");
      } else {
        const errData = await completeRes.json().catch(() => ({ error: "Failed to register study" }));
        toast.error(errData.error || "Failed to register study");
      }
    }

    setBusy(false);
  };

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const doneCount = files.filter((f) => statusMap.get(f.name + f.size + f.lastModified) === "done").length;
  const errorCount = files.filter((f) => statusMap.get(f.name + f.size + f.lastModified) === "error").length;
  const uploadingCount = files.filter((f) => statusMap.get(f.name + f.size + f.lastModified) === "uploading").length;

  const statusIcon = (s: FileStatus) => {
    if (s === "uploading") return <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400 shrink-0" />;
    if (s === "done") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
    if (s === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
    return <FileText className="h-3.5 w-3.5 text-slate-600 shrink-0" />;
  };

  const hasError = errorCount > 0;
  const allDone = doneCount === files.length && files.length > 0;
  const submitDisabled = !busy && files.length === 0;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">Upload</h1>
        <p className="mt-1 text-sm text-slate-500">
          Drag-and-drop DICOM studies for secure processing
        </p>
      </div>

      <div className="mb-6">
        <label className="text-xs font-medium text-slate-400">Study title</label>
        <input
          value={studyTitle}
          onChange={(e) => setStudyTitle(e.target.value)}
          disabled={busy}
          placeholder="e.g. John Doe - Chest X-ray"
          className="mt-1.5 h-9 w-full max-w-md rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none disabled:opacity-40"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <UploadZone onFiles={handleFiles} busy={busy} />

        <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <HardDrive className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-white">Upload Queue</span>
            </div>
            <div className="flex items-center gap-1">
              {allDone && studyUid && (
                <a
                  href={`/viewer/${studyUid}`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-emerald-400 transition-colors hover:bg-white/[0.06]"
                >
                  <ExternalLink className="h-3 w-3" />
                  View study
                </a>
              )}
              {files.length > 0 && !busy && !allDone && (
                <button
                  type="button"
                  onClick={() => { setFiles([]); statusMap.clear(); setStudyUid(null); setUploadProgress(0); rerender(); }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-400"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 text-emerald-500/70 ring-1 ring-white/[0.04]">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-400">No files selected</p>
                <p className="mt-1 text-[11px] text-slate-600 max-w-[180px]">
                  Drop DICOM files in the upload area to get started
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map((f) => {
                  const key = f.name + f.size + f.lastModified;
                  const s = statusMap.get(key) ?? "pending";
                  return (
                    <div
                      key={key}
                      className={`group relative flex items-center justify-between overflow-hidden rounded-lg border px-3 py-2.5 transition-all ${
                        s === "done"
                          ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                          : s === "error"
                            ? "border-red-500/15 bg-red-500/[0.03]"
                            : s === "uploading"
                              ? "border-emerald-500/10 bg-white/[0.04]"
                              : "border-transparent bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className={`absolute left-0 top-0 h-full w-0.5 transition-opacity ${
                        s === "done" ? "bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-100" :
                        s === "error" ? "bg-gradient-to-b from-red-400 to-red-600 opacity-100" :
                        s === "uploading" ? "bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-60" :
                        "opacity-0"
                      }`} />
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                        {statusIcon(s)}
                        <span className="truncate text-xs text-slate-300">{f.name}</span>
                        {f.name.toUpperCase() === "DICOMDIR" && (
                          <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400 uppercase leading-none">
                            DIR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {s === "error" && (
                          <button
                            type="button"
                            onClick={() => {
                              statusMap.set(key, "pending");
                              rerender();
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-red-500 transition-all hover:bg-red-500/10 active:scale-90"
                            title="Retry"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        )}
                        {s !== "uploading" && (
                          <span className="text-[10px] text-slate-600 tabular-nums">
                            {(f.size / 1024 / 1024).toFixed(1)}
                            <span className="text-slate-700"> MB</span>
                          </span>
                        )}
                        {s === "pending" && !busy && (
                          <button
                            type="button"
                            onClick={() => removeFile(key)}
                            className="flex h-6 w-6 items-center justify-center rounded text-slate-700 transition-all hover:bg-white/[0.06] hover:text-slate-400 active:scale-90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.06] p-4">
            {showNonDicomWarning && !busy && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[10px] text-amber-400">
                <FileWarning className="h-3 w-3 shrink-0" />
                <span>Some files were skipped (not valid DICOM format)</span>
              </div>
            )}

            {(busy || uploadProgress > 0) && !allDone && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {uploadingCount > 0
                      ? `Uploading... ${uploadProgress}%`
                      : hasError
                        ? `${errorCount} file${errorCount === 1 ? "" : "s"} failed`
                        : "Processing..."}
                  </span>
                  <span className="tabular-nums">
                    {doneCount + errorCount} / {files.length}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_-2px] shadow-emerald-500/40"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {!busy && files.length > 0 && !allDone && (
              <div className="mb-3 flex items-center gap-3 text-[10px] text-slate-600">
                <span className="tabular-nums">{files.length} files</span>
                <span className="text-white/[0.06]">|</span>
                <span className="tabular-nums">{(totalSize / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            )}

            {allDone && !busy && (
              <div className="mb-3 flex items-center gap-2 text-[10px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {doneCount} file{doneCount === 1 ? "" : "s"} uploaded successfully
                  {studyUid && (
                    <>
                      {" "}&middot;{" "}
                      <a href={`/viewer/${studyUid}`} className="underline hover:text-emerald-300">
                        Open study
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}

            {!busy && hasError && !allDone && (
              <div className="mb-3 flex items-center gap-2 text-[10px] text-red-400">
                <FileWarning className="h-3 w-3" />
                <span>
                  {errorCount} file{errorCount === 1 ? "" : "s"} failed.{" "}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="underline hover:text-red-300"
                  >
                    Retry all
                  </button>
                </span>
              </div>
            )}

            {!allDone && (
              <button
                type="button"
                onClick={busy ? cancelUpload : handleSubmit}
                disabled={submitDisabled}
                suppressHydrationWarning
                className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-30 disabled:active:scale-100 ${
                  busy
                    ? "bg-red-500 hover:bg-red-400 disabled:bg-red-500"
                    : "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500"
                }`}
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cancel Upload
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    Upload {files.length} file{files.length === 1 ? "" : "s"}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <UpgradeModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} currentPlan="starter" />
    </main>
  );
}

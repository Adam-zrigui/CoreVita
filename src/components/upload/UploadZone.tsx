"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FolderOpen, FileWarning } from "lucide-react";

type Props = {
  onFiles: (files: File[]) => void;
  busy?: boolean;
};

export function UploadZone({ onFiles, busy }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = Array.from(e.target.files ?? []);
      if (list.length) onFiles(list);
    },
    [onFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (busy) return;
      const list = Array.from(e.dataTransfer.files ?? []);
      if (list.length) onFiles(list);
    },
    [onFiles, busy],
  );

  const handleBrowse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      inputRef.current?.click();
    },
    [],
  );

  return (
    <div
      onDragOver={(e) => { if (!busy) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={busy ? undefined : () => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-all ${
        dragging
          ? "border-emerald-400/50 bg-emerald-500/[0.05]"
          : busy
            ? "border-white/[0.04] bg-white/[0.01] cursor-not-allowed"
            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.03]"
      }`}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-400/20" />
      )}

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 transition-colors">
        <div className={`transition-transform duration-200 ${dragging ? "scale-110" : ""}`}>
          <UploadCloud className="h-8 w-8" />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-base font-semibold text-white">
          {dragging ? "Drop files to upload" : "Drag & drop your DICOM files"}
        </p>
        <p className="text-sm text-slate-500">
          DICOMDIR directories or individual&nbsp;instances
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBrowse}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.1] disabled:opacity-30"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Browse Files
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
        <FileWarning className="h-3 w-3" />
        Supported: DICOM, DICOMDIR
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard directory attribute
        webkitdirectory="true"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

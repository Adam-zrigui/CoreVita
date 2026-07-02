"use client";

import { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

export function ReportModal({
  open,
  onClose,
  studyId,
}: {
  open: boolean;
  onClose: () => void;
  studyId: string;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handler);
      prevFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyId, content }),
      });
      if (res.ok) {
        toast.success("Report saved");
        onClose();
      } else {
        toast.error("Failed to save report");
      }
    } catch {
      toast.error("Network error");
    }
    if (mountedRef.current) setSaving(false);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.06] bg-slate-900 p-6 shadow-2xl">
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-sky-400/20 to-transparent" />
        <div className="flex items-center justify-between">
          <h2 id="report-dialog-title" className="flex items-center gap-2 text-sm font-semibold text-white">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/15 to-sky-500/10">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            Structured Report
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="rounded-md px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {["Normal", "Abnormal", "Critical"].map((t, i) => (
            <button
              key={t}
              type="button"
              className={`rounded-md border px-3 py-1 text-[11px] font-medium transition-all hover:shadow-sm active:scale-95 ${
                i === 0
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                  : i === 1
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"
                    : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
              }`}
              onClick={() => setContent((prev) => prev + `**${t.toUpperCase()}**\n`)}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-3 h-60 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none resize-none"
          placeholder="Write findings, impressions, and recommendations..."
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:hover:from-emerald-500 disabled:hover:to-emerald-600 disabled:active:scale-100"
          >
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

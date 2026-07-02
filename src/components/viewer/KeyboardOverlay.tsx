"use client";

import { useState, useEffect } from "react";

const shortcuts = [
  { key: "1-5", label: "Switch tool" },
  { key: "Scroll", label: "Slice through stack" },
  { key: "Drag", label: "Activate current tool" },
  { key: "Space", label: "Cine play / stop" },
  { key: "F", label: "Fullscreen" },
  { key: "E", label: "Export PNG" },
  { key: "R", label: "Open report" },
  { key: "Esc", label: "Deselect tool" },
];

export function KeyboardOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
      >
        Shortcuts
      </button>
      {open && (
        <div role="region" aria-label="Keyboard shortcuts" className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/[0.06] bg-slate-900 p-3 shadow-xl backdrop-blur-2xl z-50">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Keyboard Shortcuts
          </div>
          <div className="space-y-1.5">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-[11px]">
                <span className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 font-mono text-slate-400">
                  {s.key}
                </span>
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

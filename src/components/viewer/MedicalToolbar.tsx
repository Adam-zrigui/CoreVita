"use client";

import {
  Maximize,
  ZoomIn,
  ZoomOut,
  Download,
  FileText,
  Camera,
  RotateCcw,
  Contrast,
} from "lucide-react";

const baseTools = [
  { id: "fullscreen", label: "Fullscreen", icon: Maximize },
  { id: "zoomIn", label: "Zoom +", icon: ZoomIn },
  { id: "zoomOut", label: "Zoom -", icon: ZoomOut },
  { id: "invert", label: "Invert", icon: Contrast },
  { id: "reset", label: "Reset", icon: RotateCcw },
  { id: "download", label: "DICOM", icon: Download },
  { id: "export", label: "Snapshot", icon: Camera },
  { id: "report", label: "Report", icon: FileText },
];

export function MedicalToolbar({
  onAction,
  plan,
}: {
  onAction: (action: string) => void;
  plan?: "starter" | "pro" | "enterprise";
}) {
  const isAdvanced = plan === "pro" || plan === "enterprise";

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      {baseTools.map((tool) => {
        const gated = !isAdvanced && (tool.id === "export" || tool.id === "measure" || tool.id === "annotate");
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              if (gated) return;
              onAction(tool.id);
            }}
            disabled={gated}
            data-testid={`tool-${tool.id}`}
            title={gated ? "Requires the Pro plan" : tool.label}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
              gated
                ? "cursor-not-allowed text-slate-700"
                : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
            }`}
          >
            <tool.icon className="h-3.5 w-3.5" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}

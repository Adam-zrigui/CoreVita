"use client";

import { useEffect, useState, createElement, type ComponentType } from "react";
import type { Types } from "@cornerstonejs/core";
import { formatUnknownError } from "@/lib/format-error";

type Props = {
  imageIds: string[];
  activeTool: string;
  onSliceChange?: (index: number) => void;
  onViewportReady?: (viewport: Types.IStackViewport) => void;
  sliceIndex?: number;
  onElementReady?: (el: HTMLDivElement) => void;
  cinePlaying?: boolean;
  patientName?: string | null;
  title?: string | null;
  studyDate?: string | null;
  plan?: "starter" | "pro" | "enterprise";
};

export function CornerstoneViewport(props: Props) {
  const [ViewportComponent, setViewportComponent] = useState<ComponentType<Props> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./CornerstoneViewportImpl")
      .then((m) => { if (mounted) setViewportComponent(() => m.CornerstoneViewportImpl); })
      .catch((e) => { if (mounted) setError(formatUnknownError(e, "Failed to load viewer engine")); });
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black">
        <div className="flex h-full items-center justify-center px-6">
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            <div className="font-semibold">Failed to load viewer engine</div>
            <div className="mt-2 break-words text-xs text-red-100/70 font-mono">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!ViewportComponent) {
    return (
      <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black">
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-500">Loading viewer engine...</p>
        </div>
      </div>
    );
  }

  return createElement(ViewportComponent, props);
}

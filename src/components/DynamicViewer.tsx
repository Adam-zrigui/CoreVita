"use client";

import { Component, useState, useEffect, createElement, type ComponentType, type ReactNode } from "react";
import { formatUnknownError } from "@/lib/format-error";

type Series = {
  id: string;
  seriesUid: string;
  modality?: string | null;
  instanceCount: number;
  firstImageId?: string | null;
};

type ViewerProps = {
  study: {
    studyUid: string;
    patientName?: string | null;
    studyDate?: string | null;
    description?: string | null;
    series: Series[];
  };
  imageIds: string[];
  total: number;
  plan?: "starter" | "pro" | "enterprise";
};

class ViewerErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return { message: formatUnknownError(error, "DICOM viewer crashed while rendering.") };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.message) {
      return (
        <div className="flex h-[75vh] items-center justify-center rounded-lg border border-white/[0.06] bg-black px-6">
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            <div className="font-semibold">DICOM viewer crashed</div>
            <div className="mt-2 break-words text-xs text-red-100/70 font-mono">{this.state.message}</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DynamicViewer(props: ViewerProps) {
  const [Comp, setComp] = useState<ComponentType<ViewerProps> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/components/viewer/ViewerShell")
      .then((m) => { if (mounted) setComp(() => m.ViewerShell); })
      .catch((e) => { if (mounted) setError(formatUnknownError(e, "Failed to load DICOM viewer")); });
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <div className="flex h-[75vh] items-center justify-center rounded-lg border border-white/[0.06] bg-black">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
          <div className="font-semibold">Failed to load viewer</div>
          <div className="mt-2 break-words text-xs text-red-100/70 font-mono">{error}</div>
        </div>
      </div>
    );
  }

  if (!Comp) {
    return (
      <div className="flex h-[75vh] items-center justify-center rounded-lg border border-white/[0.06] bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading DICOM viewer...</p>
        </div>
      </div>
    );
  }

  return <ViewerErrorBoundary>{createElement(Comp, props)}</ViewerErrorBoundary>;
}

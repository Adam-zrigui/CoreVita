"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  RenderingEngine,
  Enums,
  imageLoader,
  type Types,
} from "@cornerstonejs/core";
import {
  Enums as ToolEnums,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  ArrowAnnotateTool,
  StackScrollTool,
  ToolGroupManager,
  init as initTools,
  addTool,
} from "@cornerstonejs/tools";
import { initCornerstone } from "@/lib/cornerstone";
import { formatUnknownError } from "@/lib/format-error";

const RENDERING_ENGINE_ID = "cv-rendering-engine";
const TOOL_GROUP_ID = "cv-tool-group";
const VIEWPORT_ID = "cv-stack-viewport";

type Props = {
  imageIds: string[];
  activeTool: string;
  onSliceChange?: (index: number) => void;
  onViewportReady?: (viewport: Types.IStackViewport) => void;
  sliceIndex?: number;
  onElementReady?: (el: HTMLDivElement) => void;
  cinePlaying?: boolean;
  patientName?: string | null;
  studyDate?: string | null;
  plan?: "starter" | "pro" | "enterprise";
};

let engineInit = false;
let engineInitPromise: Promise<void> | null = null;
let engine: RenderingEngine | null = null;

function clampSliceIndex(index: number, imageCount: number) {
  return Math.min(Math.max(index, 0), Math.max(imageCount - 1, 0));
}

async function ensureEngine(element: HTMLDivElement) {
  if (!engineInit) {
    if (!engineInitPromise) {
      engineInitPromise = (async () => {
        await initCornerstone();
        initTools();
        addTool(WindowLevelTool);
        addTool(PanTool);
        addTool(ZoomTool);
        addTool(LengthTool);
        addTool(ArrowAnnotateTool);
        addTool(StackScrollTool);
        engineInit = true;
      })();
    }
    await engineInitPromise;
  }

  if (!engine) {
    engine = new RenderingEngine(RENDERING_ENGINE_ID);
  }

  if (!ToolGroupManager.getToolGroup(TOOL_GROUP_ID)) {
    const tg = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
    if (tg) {
      tg.addTool(WindowLevelTool.toolName);
      tg.addTool(PanTool.toolName);
      tg.addTool(ZoomTool.toolName);
      tg.addTool(LengthTool.toolName);
      tg.addTool(ArrowAnnotateTool.toolName);
      tg.addTool(StackScrollTool.toolName);
    }
  }

  const existing = engine.getViewport(VIEWPORT_ID);
  if (existing) {
    try {
      engine.disableElement(VIEWPORT_ID);
    } catch {
    }
  }

  engine.enableElement({
    viewportId: VIEWPORT_ID,
    type: Enums.ViewportType.STACK,
    element,
    defaultOptions: { background: [0, 0, 0] as Types.Point3 },
  });

  const viewport = (await engine.getViewport(VIEWPORT_ID)) as Types.IStackViewport;
  return viewport;
}

export function CornerstoneViewportImpl({
  imageIds,
  activeTool,
  onSliceChange,
  onViewportReady,
  onElementReady,
  sliceIndex,
  cinePlaying,
  patientName,
  studyDate,
  plan = "starter",
}: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<Types.IStackViewport | null>(null);
  const cineRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliceIndexRef = useRef(0);
  const imageStackKey = imageIds.join("\n");
  const imageCount = imageIds.length;
  console.log("[viewer] imageCount:", imageCount, "first:", imageIds[0]?.slice(0, 80));
  const imageIdsRef = useRef<string[]>(imageStackKey ? imageStackKey.split("\n") : []);
  const onSliceChangeRef = useRef(onSliceChange);
  onSliceChangeRef.current = onSliceChange;
  const onViewportReadyRef = useRef(onViewportReady);
  onViewportReadyRef.current = onViewportReady;
  const onElementReadyRef = useRef(onElementReady);
  onElementReadyRef.current = onElementReady;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<number | null>(null);
  const preloadStarted = useRef(false);
  const emptyError = imageCount === 0 ? "No DICOM images are available for this study." : null;

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowLoading(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [loading]);

  const stopCine = useCallback(() => {
    if (cineRef.current) {
      clearInterval(cineRef.current);
      cineRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("[viewport] unhandled rejection:", event.reason);
    };

    const handleError = (event: ErrorEvent) => {
      if (event.target === window) {
        console.warn("[viewport] global error:", event.error ?? event.message);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError, { capture: true });
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError, { capture: true });
    };
  }, []);

  useEffect(() => {
    sliceIndexRef.current = sliceIndex ?? 0;
  }, [sliceIndex]);

  useEffect(() => {
    imageIdsRef.current = imageStackKey ? imageStackKey.split("\n") : [];
  }, [imageStackKey]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    const currentImageIds = imageIdsRef.current;
    if (currentImageIds.length === 0) return;

    let cancelled = false;
    let removeNewImageListener: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    (async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const viewport = await ensureEngine(el);
        if (cancelled) return;

        viewportRef.current = viewport;

        const initialIndex = clampSliceIndex(sliceIndexRef.current, currentImageIds.length);
        await viewport.setStack(currentImageIds, initialIndex);

        const driftedIndex = clampSliceIndex(sliceIndexRef.current, currentImageIds.length);
        if (driftedIndex !== initialIndex) {
          await viewport.setImageIdIndex(driftedIndex).catch((e) => console.warn("[viewport] setImageIdIndex failed:", e));
          sliceIndexRef.current = driftedIndex;
        } else {
          sliceIndexRef.current = initialIndex;
        }

        engine?.resize(true, false);
        viewport.render();
        setLoading(false);

        resizeObserver = new ResizeObserver(() => {
          engine?.resize(true, false);
          viewport.render();
        });
        resizeObserver.observe(el);

        const tg = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
        tg?.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
        tg?.setToolActive(StackScrollTool.toolName, {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
        });

        onViewportReadyRef.current?.(viewport);
        onElementReadyRef.current?.(wrapperRef.current ?? el);

        const onNewImage = (evt: Event) => {
          const detail = (evt as CustomEvent).detail;
          if (detail?.imageIdIndex != null) {
            sliceIndexRef.current = detail.imageIdIndex;
            onSliceChangeRef.current?.(detail.imageIdIndex);
          }
        };
        el.addEventListener(Enums.Events.STACK_NEW_IMAGE, onNewImage as EventListener);
        removeNewImageListener = () => {
          el.removeEventListener(Enums.Events.STACK_NEW_IMAGE, onNewImage as EventListener);
        };
      } catch (error) {
        if (cancelled) return;
        console.error("DICOM stack load failed:", error);
        setLoadError(formatUnknownError(error, "Unknown DICOM loading error"));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      removeNewImageListener?.();
      resizeObserver?.disconnect();
      stopCine();
      viewportRef.current = null;
      try {
        engine?.disableElement(VIEWPORT_ID);
      } catch {
      }
    };
  }, [imageStackKey, stopCine]);

  useEffect(() => {
    if (imageCount === 0 || loading) return;

    const nextIndex = clampSliceIndex(sliceIndex ?? 0, imageCount);
    let cancelled = false;

    const vp = engine?.getViewport(VIEWPORT_ID) as Types.IStackViewport | undefined;
    if (!vp) return;

    try {
      const stack = vp.getImageIds();
      if (!stack || stack.length === 0) return;
    } catch {
      return;
    }

    if (vp.getCurrentImageIdIndex() === nextIndex) return;

    (async () => {
      try {
        await vp.setImageIdIndex(nextIndex);
        if (cancelled) return;
        sliceIndexRef.current = nextIndex;
        vp.render();
      } catch (error: unknown) {
        if (cancelled) return;
        const msg = error instanceof Error ? error.message : "";
        if (msg.includes("destroyed") || msg.includes("no longer usable")) return;
        console.warn("[viewer] DICOM slice change failed at index", nextIndex, error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sliceIndex, imageCount, imageStackKey, loading]);

  useEffect(() => {
    const vp = viewportRef.current;
    const currentImageIds = imageIdsRef.current;
    if (!vp || currentImageIds.length <= 1 || loading) return;

    const currentIndex = sliceIndexRef.current;
    const sorted = currentImageIds
      .map((id, i) => ({ id, dist: Math.abs(i - currentIndex) }))
      .sort((a, b) => a.dist - b.dist);

    const total = sorted.length;

    const CONCURRENCY = 16;
    let cancelled = false;
    let next = 0;
    let loaded = 0;

    function tick() {
      if (!cancelled) setPreloadProgress(Math.min(loaded, total));
    }

    async function worker() {
      while (next < sorted.length && !cancelled) {
        const { id } = sorted[next++];
        try {
          await imageLoader.loadAndCacheImage(id);
        } catch (e) {
          console.warn("DICOM preload failed for image:", id, e);
        }
        if (!cancelled) {
          loaded++;
          tick();
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    Promise.all(workers)
      .then(() => { if (!cancelled) setPreloadProgress(null); })
      .catch((e) => console.warn("[viewport] preload cache error:", e));

    return () => { cancelled = true; setPreloadProgress(null); };
  }, [imageStackKey, sliceIndex, loading]);

  useEffect(() => {
    const tg = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (!tg) return;

    try {
      const mapping: Record<string, string> = {
        wl: WindowLevelTool.toolName,
        pan: PanTool.toolName,
        zoom: ZoomTool.toolName,
        measure: LengthTool.toolName,
        annotate: ArrowAnnotateTool.toolName,
      };

      const selected = mapping[activeTool] ?? WindowLevelTool.toolName;

      tg.setToolPassive(WindowLevelTool.toolName);
      tg.setToolPassive(PanTool.toolName);
      tg.setToolPassive(ZoomTool.toolName);
      tg.setToolPassive(LengthTool.toolName);
      tg.setToolPassive(ArrowAnnotateTool.toolName);
      tg.setToolActive(selected, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
      });
    } catch (error) {
      if (mountedRef.current) {
        setLoadError(formatUnknownError(error, "DICOM tool activation failed."));
      }
    }
  }, [activeTool]);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (cinePlaying && imageCount > 1) {
      stopCine();
      let i = sliceIndexRef.current;
      cineRef.current = setInterval(() => {
        i = (i + 1) % imageCount;
        sliceIndexRef.current = i;
        onSliceChangeRef.current?.(i);
        try {
          viewportRef.current?.setImageIdIndex(i);
          viewportRef.current?.render();
        } catch (error) {
          setLoadError(formatUnknownError(error, "DICOM cine playback failed."));
          stopCine();
        }
      }, 100);
    } else {
      stopCine();
    }
    return stopCine;
  }, [cinePlaying, imageCount, stopCine]);

  return (
    <div ref={wrapperRef} className="relative h-[75vh] w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black">
      <div ref={elementRef} className="h-full w-full" />

      {showLoading && !loadError && !emptyError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-slate-300">Loading MRI</p>
              <p className="text-[11px] text-slate-600">{imageCount} images</p>
            </div>
          </div>
        </div>
      )}

      {preloadProgress != null && !showLoading && !loadError && !emptyError && (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-black/80 px-3 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
          Caching images&hellip; {preloadProgress} / {imageCount}
        </div>
      )}

      {(loadError || emptyError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center">
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            <div className="font-semibold">DICOM could not be displayed</div>
            <div className="mt-2 break-words text-xs text-red-100/70">{loadError || emptyError}</div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-3 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] text-white/70 backdrop-blur-sm">
        <span className="font-medium text-white/90">{patientName ?? "?"}</span>
        {studyDate && (
          <>
            <span className="text-white/30">|</span>
            <span>{studyDate}</span>
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/60 px-2.5 py-1.5 text-[11px] text-white/50 backdrop-blur-sm tabular-nums">
        {Math.min((sliceIndex ?? 0) + 1, imageCount)} / {imageCount}
      </div>

      {plan === "starter" && (
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 flex w-7 items-center justify-center select-none bg-black/40 backdrop-blur-sm">
          <span className="[writing-mode:vertical-rl] text-[9px] font-semibold tracking-[0.15em] text-white/40 select-none uppercase">
            Powered by CoreVita
          </span>
        </div>
      )}
    </div>
  );
}

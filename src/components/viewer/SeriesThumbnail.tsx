"use client";

import { useEffect, useRef, memo } from "react";

export const SeriesThumbnail = memo(function SeriesThumbnail({ imageId }: { imageId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    (async () => {
      try {
        const { imageLoader } = await import("@cornerstonejs/core");
        const image = await imageLoader.loadAndCacheImage(imageId);
        if (cancelled || !canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width, height } = image;
        const cw = canvas.width;
        const ch = canvas.height;

        const scale = Math.min(cw / width, ch / height);
        const dw = width * scale;
        const dh = height * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.clearRect(0, 0, cw, ch);
        const imageData = image.getPixelData();
        const minMax = imageData instanceof Float32Array
          ? (() => { let mn = Infinity, mx = -Infinity; for (let i = 0; i < imageData.length; i++) { const v = imageData[i]; if (v < mn) mn = v; if (v > mx) mx = v; } return { min: mn, max: mx }; })()
          : { min: 0, max: 255 };

        const range = minMax.max - minMax.min || 1;
        const scaled = new Uint8ClampedArray(imageData.length);
        for (let i = 0; i < imageData.length; i++) {
          scaled[i] = ((imageData[i] - minMax.min) / range) * 255;
        }

        const imageBitmap = new ImageData(
          new Uint8ClampedArray(scaled.buffer),
          width,
          height
        );

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.putImageData(imageBitmap, 0, 0);
        ctx.drawImage(tempCanvas, dx, dy, dw, dh);
      } catch {
        // silently fail thumbnail
      }
    })();

    return () => { cancelled = true; };
  }, [imageId]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="w-full aspect-square rounded-md bg-black/50 object-contain"
    />
  );
});

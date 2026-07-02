import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFromB2 } from "@/lib/storage";
import { verifyDicomToken } from "@/lib/signing";
import { formatUnknownError } from "@/lib/format-error";
import { isDicomPart10 } from "@/lib/dicom-validation";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token");
  const payload = verifyDicomToken(token);
  if (!payload || payload.id !== id) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const instance = await prisma.instance.findUnique({
    where: { id },
  }).catch((error) => {
    console.error("[dicom] instance lookup failed:", formatUnknownError(error));
    return new NextResponse("Internal server error", { status: 503 });
  });
  if (instance instanceof NextResponse) return instance;
  if (!instance) return new NextResponse(null, { status: 404 });
  if (instance.storageDriver !== "b2") {
    return new NextResponse("Storage driver not supported", { status: 400 });
  }

  const obj = await getFromB2(instance.storageKey).catch((error) => {
    console.error("[dicom] B2 fetch failed:", formatUnknownError(error));
    return new NextResponse("Internal server error", { status: 502 });
  });
  if (obj instanceof NextResponse) return obj;
  if (!obj) return new NextResponse(null, { status: 404 });

  if (!isDicomPart10(obj.buffer)) {
    console.warn(`[dicom] instance ${id} failed server-side DICOM validation, serving as octet-stream`);
  }

  const isDownload = new URL(req.url).searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(obj.buffer), {
    headers: {
      "content-type": obj.contentType ?? "application/dicom",
      "content-length": String(obj.buffer.length),
      "cache-control": "private, max-age=300",
      ...(isDownload ? { "content-disposition": `attachment; filename="${id}.dcm"` } : {}),
    },
  });
}

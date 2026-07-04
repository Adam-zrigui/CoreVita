import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { getServerSession } from "@/lib/auth";
import { uploadToB2, uploadDicomMetadata } from "@/lib/storage";
import { enqueueUpload } from "@/lib/queue";
import { isDicomPart10, readDicomSortMetadata } from "@/lib/dicom-validation";
import { parseInstanceNumber, parseSeriesNumber, parseSeriesUid } from "@/lib/dicom-instance-number";
import { sanitizeDicomMetadata } from "@/lib/dicom-sanitize";
import { getActorTenant } from "@/lib/rbac";

export const runtime = "nodejs";

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const uploadId = req.headers.get("x-upload-id") || req.headers.get("upload-id") || randomUUID();
    const filename = req.headers.get("x-filename") || req.headers.get("filename") || "file.dcm";
    const chunkIndex = parseInt(req.headers.get("x-chunk-index") || "0", 10);
    const totalChunks = parseInt(req.headers.get("x-total-chunks") || "1", 10);
    const isLast = (req.headers.get("x-is-last") || "false") === "true" || chunkIndex === totalChunks - 1;

    const tmpBase = path.join(os.tmpdir(), "corevita-upload-chunks", uploadId);
    ensureDir(tmpBase);
    const chunkPath = path.join(tmpBase, `${chunkIndex}.part`);

    const ab = await req.arrayBuffer();
    const buffer = Buffer.from(ab);
    fs.writeFileSync(chunkPath, buffer);

    if (!isLast) {
      return NextResponse.json({ ok: true, uploaded: chunkIndex });
    }

    // assemble
    const parts = [] as Buffer[];
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(tmpBase, `${i}.part`);
      if (!fs.existsSync(p)) throw new Error("Missing chunk " + i);
      parts.push(fs.readFileSync(p));
    }
    const full = Buffer.concat(parts);

    // basic DICOM checks and metadata
    if (!isDicomPart10(full)) {
      // cleanup
      try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}
      return NextResponse.json({ error: "Not a DICOM Part 10 file" }, { status: 400 });
    }

    const instanceNumber = parseInstanceNumber(full);
    const seriesNumber = parseSeriesNumber(full);
    const seriesUid = parseSeriesUid(full);
    const metadata = readDicomSortMetadata(full);

    // upload to B2
    const key = `${uploadId}/${filename}`;
    await uploadToB2(key, full, "application/dicom");
    if (Object.keys(metadata).length > 0) {
      await uploadDicomMetadata(key, metadata).catch(() => {});
    }

    // prepare enqueue payload for single-file study
    const studyUid = `study-${randomUUID()}`;
    const fileEntry = {
      name: filename,
      storageKey: key,
      driver: "b2",
      originalPath: filename,
      instanceNumber: instanceNumber ?? undefined,
    };

    const series = [{
      seriesUid: seriesUid || `series-${randomUUID()}`,
      seriesNumber: seriesNumber ?? undefined,
      files: [fileEntry],
      modality: metadata?.modality || undefined,
      sopMap: undefined,
    }];

    const sanitizedPatientName = metadata?.patientName ? sanitizeDicomMetadata(metadata.patientName) : "Unknown";
    const sanitizedDescription = metadata?.description ? sanitizeDicomMetadata(metadata.description) : "Imported Study";

    const actorTenant = await getActorTenant(session);
    const tenantId = actorTenant instanceof Response ? undefined : actorTenant.tenantId;

    const queued = await enqueueUpload({
      studyUid,
      series: series.map((s) => ({
        seriesUid: s.seriesUid,
        seriesNumber: s.seriesNumber,
        files: s.files.map((f) => ({
          name: f.name,
          storageKey: f.storageKey,
          driver: f.driver,
          originalPath: f.originalPath,
          instanceNumber: f.instanceNumber,
        })),
        modality: s.modality,
        sopMap: undefined,
      })),
      patientName: sanitizedPatientName,
      studyDate: metadata?.studyDate,
      description: sanitizedDescription,
    });

    // cleanup
    try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}

    return NextResponse.json({ ok: true, queued: !!queued, studyUid });
  } catch (error) {
    console.error("chunk upload error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

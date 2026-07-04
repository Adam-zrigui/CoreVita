import { NextResponse } from "next/server";
import Busboy from "busboy";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { getServerSession } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/db";
import { getStorageDriver, uploadToB2, uploadDicomMetadata } from "@/lib/storage";
import { readDicomSortMetadata } from "@/lib/dicom-validation";
import { getRedis, clearStudiesCache } from "@/lib/redis";
import { enqueueUpload } from "@/lib/queue";
import { normalizeDicomPath, parseDicomdirStructured } from "@/lib/dicomdir";
import { parseInstanceNumber, parseSeriesNumber, parseSeriesUid } from "@/lib/dicom-instance-number";
import { isDicomPart10 } from "@/lib/dicom-validation";
import { sanitizeDicomMetadata } from "@/lib/dicom-sanitize";
import { getCurrentPlan } from "@/lib/plans";
import { getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`upload:${session.user.id}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });
    }

    const planInfo = await getCurrentPlan(session);
    if (planInfo.status === "none" && planInfo.plan !== "starter") {
      return NextResponse.json({ error: "Subscription required", redirect: "/services/pricing" }, { status: 402 });
    }

    if (planInfo.used >= planInfo.limit) {
      return NextResponse.json({
        error: `Study limit reached (${planInfo.used}/${planInfo.limit}). Upgrade your plan to upload more studies.`,
        redirect: "/services/pricing",
      }, { status: 402 });
    }

    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart upload" }, { status: 400 });
    }

    const uploadId = randomUUID();
  const storageDriver = getStorageDriver();
  if (storageDriver !== "b2") {
    return NextResponse.json({ error: "Storage driver must be b2" }, { status: 400 });
  }
  const actorTenant = await getActorTenant(session);
  if (actorTenant instanceof Response) return actorTenant;
  const tenantId = actorTenant.tenantId;

  const files: { name: string; storageKey: string; driver: string; originalPath: string; instanceNumber?: number; seriesUid?: string; seriesNumber?: number }[] = [];
  const uploads: Promise<void>[] = [];
  let dicomdirBuffer: Buffer | null = null;
  let studyTitle: string | null = null;

  const bb = Busboy({
    headers: { "content-type": contentType },
    limits: { fileSize: 500 * 1024 * 1024, files: 5000 },
  } as any);

  bb.on("field", (name, val) => {
    if (name === "title" && typeof val === "string" && val.trim()) {
      studyTitle = val.trim();
    }
  });

  bb.on("file", (_name, file, info) => {
    const originalPath = info.filename || "unknown";
    const normalizedPath = normalizeDicomPath(originalPath);
    const isDicomdir = normalizedPath.endsWith("dicomdir");
    if (isDicomdir) {
      const chunks: Buffer[] = [];
      file.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      file.on("end", () => {
        dicomdirBuffer = Buffer.concat(chunks);
      });
      file.on("error", () => {});
      return;
    }
    const key = `${uploadId}/${normalizedPath}`;
    const chunks: Buffer[] = [];
    file.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    file.on("end", () => {
      const buffer = Buffer.concat(chunks);
      if (!isDicomPart10(buffer)) {
        return;
      }
      const instanceNumber = parseInstanceNumber(buffer);
      const seriesNumber = parseSeriesNumber(buffer);
      const seriesUid = parseSeriesUid(buffer);
      uploads.push(uploadToB2(key, buffer, info.mimeType || "application/dicom"));
      const metadata = readDicomSortMetadata(buffer);
      if (Object.keys(metadata).length > 0) {
        uploads.push(uploadDicomMetadata(key, metadata));
      }
      files.push({
        name: originalPath,
        storageKey: key,
        driver: "b2",
        originalPath: normalizedPath,
        instanceNumber: instanceNumber ?? undefined,
        seriesUid: seriesUid ?? undefined,
        seriesNumber: seriesNumber ?? undefined,
      });
      file.on("error", () => {});
    });
  });

  const reader = req.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }

  const finished = new Promise<void>((resolve, reject) => {
    bb.on("error", reject);
    bb.on("finish", () => resolve());
  });

  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bb.write(value);
      }
    } finally {
      try { bb.end(); } catch {}
    }
  };

  await Promise.all([pump(), finished]);
  await Promise.all(uploads);

  const studyUid = `study-${randomUUID()}`;

  let orderedFiles = files;
  let seriesGroups: { seriesUid: string; seriesNumber?: number; files: typeof files; modality?: string; sopMap?: Map<string, string> }[] = [];
  let studyUidFromDir: string | undefined;
  let patientNameFromDir: string | undefined;
  let studyDateFromDir: string | undefined;
  let descriptionFromDir: string | undefined;
  if (dicomdirBuffer) {
    const structured = parseDicomdirStructured(dicomdirBuffer);
    studyUidFromDir = structured.studyUid;
    patientNameFromDir = structured.patientName;
    studyDateFromDir = structured.studyDate;
    descriptionFromDir = structured.description;
    if (structured.order.length > 0) {
      const byPath = new Map(files.map((f) => [f.originalPath, f]));
      const ordered: typeof files = [];
      for (const p of structured.order) {
        const hit = byPath.get(p);
        if (hit) {
          ordered.push(hit);
          byPath.delete(p);
        }
      }
      for (const remaining of byPath.values()) ordered.push(remaining);
      orderedFiles = ordered;
    }
    if (structured.series.length > 0) {
      const byPath = new Map(orderedFiles.map((f) => [f.originalPath, f]));
      seriesGroups = structured.series.map((s) => ({
        seriesUid: s.seriesUid,
        seriesNumber: s.seriesNumber,
        files: s.files.map((p) => byPath.get(p)).filter(Boolean) as typeof files,
        modality: "modality" in s ? s.modality : undefined,
        sopMap: "sopMap" in s ? s.sopMap : undefined,
      }));
      seriesGroups = seriesGroups.filter((s) => s.files.length > 0);
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No DICOM image files were found in the upload." }, { status: 400 });
  }

  if (seriesGroups.length === 0) {
    const bySeries = new Map<string, typeof files>();
    const seriesMeta = new Map<string, { seriesNumber?: number; modality?: string }>();
    for (const f of orderedFiles) {
      const suid = f.seriesUid || `series-${randomUUID()}`;
      const existing = bySeries.get(suid);
      if (existing) {
        existing.push(f);
      } else {
        bySeries.set(suid, [f]);
        seriesMeta.set(suid, { seriesNumber: f.seriesNumber });
      }
    }
    const keys = Array.from(bySeries.keys());
    seriesGroups = keys.map((suid) => ({
      seriesUid: suid,
      seriesNumber: seriesMeta.get(suid)?.seriesNumber,
      files: bySeries.get(suid)!,
      modality: undefined,
    }));
    if (seriesGroups.length === 0) {
      seriesGroups = [{
        seriesUid: `series-${randomUUID()}`,
        files: orderedFiles,
        modality: "MR",
      }];
    }
  }

  const effectiveStudyUid = studyUidFromDir || studyUid;

  const sanitizedPatientName = patientNameFromDir
    ? sanitizeDicomMetadata(patientNameFromDir)
    : "Unknown";
  const sanitizedTitle = studyTitle
    ? sanitizeDicomMetadata(studyTitle)
    : null;
  const sanitizedDescription = studyTitle
    ? sanitizeDicomMetadata(studyTitle)
    : descriptionFromDir
      ? sanitizeDicomMetadata(descriptionFromDir)
      : "Imported Study";

  const queued = await enqueueUpload({
    studyUid: effectiveStudyUid,
    series: seriesGroups.map((s) => ({
      seriesUid: s.seriesUid,
      seriesNumber: s.seriesNumber,
      files: s.files.map((file) => ({
        name: file.name,
        storageKey: file.storageKey,
        driver: file.driver,
        originalPath: file.originalPath,
        instanceNumber: file.instanceNumber,
      })),
      modality: s.modality,
      sopMap: s.sopMap ? Array.from(s.sopMap.entries()) : undefined,
    })),
    patientName: sanitizedPatientName,
    studyDate: studyDateFromDir,
    description: sanitizedDescription,
    title: sanitizedTitle,
  });

  if (queued) {
    try {
      const redis = getRedis();
      if (redis) await clearStudiesCache(redis);
    } catch (e) {
      console.warn("[upload] cache invalidation failed:", e);
    }
    const actorInfo = await getActorTenant(session);
    if (!(actorInfo instanceof Response)) {
      logAudit(actorInfo.tenantId, actorInfo.actorId, "study.upload", effectiveStudyUid, { queued: true }).catch((e) => console.error("[audit] study.upload failed:", e));
    }
    return NextResponse.json({ ok: true, queued: true, studyUid: effectiveStudyUid });
  }

  const study = await withDbRetry(() =>
    prisma.study.create({
      data: {
        tenantId,
        uploadedById: actorTenant.actorId,
        studyUid: effectiveStudyUid,
        patientName: sanitizedPatientName,
        title: sanitizedTitle,
        description: sanitizedDescription,
        studyDate: studyDateFromDir,
        modality: "MR",
        slices: orderedFiles.length,
        status: "PENDING",
        series: {
          create: seriesGroups.map((s) => ({
            seriesUid: s.seriesUid,
            seriesNumber: s.seriesNumber ?? null,
            modality: s.modality ?? "MR",
            instanceCount: s.files.length,
            instances: {
              create: s.files.map((file, index) => ({
                filePath: null,
                storageDriver: file.driver,
                storageKey: file.storageKey,
                sopInstanceUid: s.sopMap?.get(file.originalPath) ?? file.name,
                instanceNumber: file.instanceNumber ?? index,
              })),
            },
          })),
        },
      },
    })
  );

  try {
    const redis2 = getRedis();
    if (redis2) await clearStudiesCache(redis2);
  } catch (e) {
    console.warn("[upload] cache invalidation failed:", e);
  }

  const actorInfo = await getActorTenant(session);
  if (!(actorInfo instanceof Response)) {
    logAudit(actorInfo.tenantId, actorInfo.actorId, "study.upload", study.studyUid).catch((e) => console.error("[audit] study.upload failed:", e));
  }

  return NextResponse.json({ ok: true, studyUid: study.studyUid, queued: false });
  } catch (error) {
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("Upload error:", msg, error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

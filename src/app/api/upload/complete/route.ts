import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/db";
import { getStorageDriver, uploadDicomMetadata, getFromB2 } from "@/lib/storage";
import { readDicomSortMetadata, isDicomPart10 } from "@/lib/dicom-validation";
import { getCurrentPlan } from "@/lib/plans";
import { getActorTenant } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { normalizeDicomPath } from "@/lib/dicomdir";
import { z } from "zod";

const bodySchema = z.object({
  entries: z.array(z.object({
    name: z.string(),
    storageKey: z.string(),
    size: z.number(),
  })).min(1),
  title: z.string().optional(),
  tenantId: z.string(),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planInfo = await getCurrentPlan(session);
    if (planInfo.status === "none" && planInfo.plan !== "starter") {
      return NextResponse.json({ error: "Subscription required" }, { status: 402 });
    }

    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) return actorInfo;

    const body = await req.json();
    const parsed = bodySchema.parse(body);

    const isDicomdir = parsed.entries.some((e) => e.name.toUpperCase() === "DICOMDIR");

    if (isDicomdir) {
      return await processDicomdir(session.user.id, actorInfo.tenantId, parsed, body.title);
    }

    return await processIndividualFiles(session.user.id, actorInfo.tenantId, parsed, body.title);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[upload/complete] failed:", error);
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
  }
}

async function processDicomdir(userId: string, tenantId: string, parsed: z.infer<typeof bodySchema>, title?: string) {
  const dicomdirEntry = parsed.entries.find((e) => e.name.toUpperCase() === "DICOMDIR")!;
  const file = await getFromB2(dicomdirEntry.storageKey);
  if (!file) return NextResponse.json({ error: "DICOMDIR not found in storage" }, { status: 400 });

  const { parseDicomdirStructured } = await import("@/lib/dicomdir");
  const structured = parseDicomdirStructured(file.buffer);
  const seriesList = structured.series as unknown as {
    seriesUid: string;
    files: string[];
    modality?: string;
    sopMap?: Map<string, string>;
    seriesNumber?: number;
  }[];

  const storageKeyMap = new Map(parsed.entries.map((e) => [e.name, e.storageKey]));

  const studyUid = structured.studyUid || "";
  const patientName = structured.patientName || "";
  const patientId = "";
  const studyDate = structured.studyDate || "";
  const studyDescription = structured.description || "";
  const modalitySet = new Set(seriesList.map((s) => s.modality).filter(Boolean) as string[]);
  const totalSlices = seriesList.reduce((sum, s) => sum + s.files.length, 0);

  for (const series of seriesList) {
    const seriesUid = series.seriesUid || randomUUID();
    for (const refPath of series.files) {
      const normalized = normalizeDicomPath(refPath);
      const storageKey = storageKeyMap.get(normalized);
      if (!storageKey) continue;

      await uploadDicomMetadata(storageKey, {
        modality: series.modality ?? "OT",
        patientName,
        studyDate,
        description: studyDescription,
      });
    }
  }

  return await createStudyFromEntries(userId, tenantId, parsed.entries, storageKeyMap, {
    studyUid,
    patientName,
    patientId,
    studyDate,
    description: studyDescription,
    title,
    modality: [...modalitySet].join("/"),
    slices: totalSlices,
  });
}

async function processIndividualFiles(userId: string, tenantId: string, parsed: z.infer<typeof bodySchema>, title?: string) {
  const storageKeyMap = new Map(parsed.entries.map((e) => [e.name, e.storageKey]));
  const entriesWithMeta = await extractMetadata(parsed.entries);

  if (entriesWithMeta.length === 0) {
    return NextResponse.json({ error: "No valid DICOM files found" }, { status: 400 });
  }

  const first = entriesWithMeta[0];
  const studyUid = first.meta.studyUid || randomUUID();
  const patientName = first.meta.patientName ?? "";
  const patientId = first.meta.patientId ?? "";
  const studyDate = first.meta.studyDate ?? "";
  const description = first.meta.studyDescription ?? "";
  const modalitySet = new Set(entriesWithMeta.map((e) => e.meta.modality).filter(Boolean));

  for (const entry of entriesWithMeta) {
    await uploadDicomMetadata(entry.storageKey, entry.meta);
  }

  return await createStudyFromEntries(userId, tenantId, parsed.entries, storageKeyMap, {
    studyUid,
    patientName,
    patientId,
    studyDate,
    description,
    title,
    modality: [...modalitySet].join("/"),
    slices: entriesWithMeta.length,
  });
}

type MetaEntry = { name: string; storageKey: string; size: number; meta: any };

async function extractMetadata(entries: z.infer<typeof bodySchema>["entries"]): Promise<MetaEntry[]> {
  const results: MetaEntry[] = [];
  for (const entry of entries) {
    if (entry.name.toUpperCase() === "DICOMDIR") continue;
    try {
      const file = await getFromB2(entry.storageKey);
      if (!file) continue;
      if (!isDicomPart10(file.buffer)) continue;
      const meta = readDicomSortMetadata(file.buffer);
      results.push({ ...entry, meta });
    } catch {
      // skip invalid files
    }
  }
  return results;
}

async function createStudyFromEntries(
  userId: string,
  tenantId: string,
  entries: z.infer<typeof bodySchema>["entries"],
  storageKeyMap: Map<string, string>,
  studyInfo: {
    studyUid: string;
    patientName: string;
    patientId: string;
    studyDate: string;
    description: string;
    title?: string;
    modality: string;
    slices: number;
  },
) {
  const metaEntries = await extractMetadata(entries);
  const seriesMap = new Map<string, { uid: string; modality: string; instances: MetaEntry[]; seriesNumber?: number; seriesDescription?: string }>();

  for (const entry of metaEntries) {
    const seriesUid = entry.meta.seriesUid || "1";
    if (!seriesMap.has(seriesUid)) {
      seriesMap.set(seriesUid, {
        uid: seriesUid,
        modality: entry.meta.modality ?? "OT",
        instances: [],
        seriesNumber: entry.meta.seriesNumber ?? undefined,
        seriesDescription: entry.meta.seriesDescription ?? undefined,
      });
    }
    seriesMap.get(seriesUid)!.instances.push(entry);
  }

  try {
    const study = await withDbRetry(() =>
      prisma.study.create({
        data: {
          tenantId,
          studyUid: studyInfo.studyUid,
          title: studyInfo.title ?? null,
          patientName: studyInfo.patientName || null,
          patientId: studyInfo.patientId || null,
          studyDate: studyInfo.studyDate || null,
          description: studyInfo.description || null,
          modality: studyInfo.modality || null,
          slices: studyInfo.slices,
          uploadedById: userId,
          series: {
            create: [...seriesMap.values()].map((s) => ({
              seriesUid: s.uid,
              modality: s.modality,
              seriesNumber: s.seriesNumber ?? null,
              instanceCount: s.instances.length,
              instances: {
                create: s.instances.map((inst) => ({
                  sopInstanceUid: inst.meta.sopInstanceUid ?? undefined,
                  instanceNumber: inst.meta.instanceNumber ?? undefined,
                  storageDriver: getStorageDriver(),
                  storageKey: inst.storageKey,
                })),
              },
            })),
          },
        },
        include: { series: true },
      })
    );

    logAudit(tenantId, userId, "study.upload", study.studyUid, {
      name: studyInfo.title || studyInfo.patientName || "Untitled",
      slices: studyInfo.slices,
      series: seriesMap.size,
    });

    return NextResponse.json({ studyUid: study.studyUid, id: study.id });
  } catch (err) {
    console.error("[upload/complete] db create failed:", err);
    return NextResponse.json({ error: "Failed to create study record" }, { status: 500 });
  }
}

import dicomParser from "dicom-parser";

function normalizePath(path: string) {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  const parts = normalized.split("/").filter(Boolean);
  const cleaned = parts.filter((p) => p !== "..").join("/");
  return cleaned.replace(/^\.\//, "");
}

export function parseDicomdirStructured(buffer: Buffer) {
  let dataSet: ReturnType<typeof dicomParser.parseDicom>;
  try {
    dataSet = dicomParser.parseDicom(new Uint8Array(buffer));
  } catch {
    return { order: [] as string[], series: [] as { seriesUid: string; seriesNumber?: number; files: string[] }[], studyUid: undefined, patientName: undefined, studyDate: undefined, description: undefined };
  }
  const dirSeq = dataSet.elements.x00041220;
  if (!dirSeq || !dirSeq.items) {
    return { order: [] as string[], series: [] as { seriesUid: string; seriesNumber?: number; files: string[] }[], studyUid: undefined, patientName: undefined, studyDate: undefined, description: undefined };
  }
  const order: string[] = [];
  const seriesMap = new Map<string, { files: string[]; modality?: string; sopMap: Map<string, string>; seriesNumber?: number }>();
  let studyUid: string | undefined;
  let patientName: string | undefined;
  let studyDate: string | undefined;
  let description: string | undefined;
  for (const item of dirSeq.items) {
    const ds = item.dataSet;
    if (!ds) continue;
    const type = (ds.string("x00041430") || "").toUpperCase();
    const fileId = ds.string("x00041500");
    if (!fileId) continue;
    const normalized = normalizePath(fileId);
    if (!normalized) continue;
    order.push(normalized);
    const sUid = ds.string("x0020000e") || "series-unknown";
    if (!studyUid) {
      const s = ds.string("x0020000d");
      if (s) studyUid = s;
    }
    if (!patientName) {
      const pn = ds.string("x00100010");
      if (pn) patientName = pn;
    }
    if (!studyDate) {
      const sd = ds.string("x00080020");
      if (sd) studyDate = sd;
    }
    if (!description) {
      const desc = ds.string("x00081030");
      if (desc) description = desc;
    }
    const modality = ds.string("x00080060") || undefined;
    const sop = ds.string("x00080018") || undefined;
    if (type === "SERIES") {
      const seriesNumber = ds.intString("x00200011") ?? undefined;
      if (!seriesMap.has(sUid)) {
        seriesMap.set(sUid, { files: [], modality, sopMap: new Map(), seriesNumber });
      }
    }
    if (type === "IMAGE") {
      if (!seriesMap.has(sUid)) {
        seriesMap.set(sUid, { files: [], modality, sopMap: new Map(), seriesNumber: undefined });
      }
      const entry = seriesMap.get(sUid)!;
      entry.files.push(normalized);
      if (modality && !entry.modality) entry.modality = modality;
      if (sop) entry.sopMap.set(normalized, sop);
    }
  }
  const series = Array.from(seriesMap.entries()).map(([seriesUid, entry]) => ({
    seriesUid,
    files: entry.files,
    modality: entry.modality,
    sopMap: entry.sopMap,
    seriesNumber: entry.seriesNumber,
  }));
  return { order, series, studyUid, patientName, studyDate, description };
}

export function normalizeDicomPath(path: string) {
  return normalizePath(path);
}

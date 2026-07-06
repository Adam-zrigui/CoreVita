import dicomParser from "dicom-parser";

export type DicomSortMetadata = {
  studyUid?: string;
  seriesUid?: string;
  sopInstanceUid?: string;
  acquisitionNumber?: number;
  instanceNumber?: number;
  seriesNumber?: number;
  seriesDescription?: string;
  studyDescription?: string;
  imagePosition?: [number, number, number];
  sliceLocation?: number;
  transferSyntaxUid?: string;
  hasPixelData?: boolean;
  modality?: string;
  patientName?: string;
  patientId?: string;
  description?: string;
  studyDate?: string;
};

const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  "1.2.840.10008.1.2",
  "1.2.840.10008.1.2.1",
  "1.2.840.10008.1.2.2",
  "1.2.840.10008.1.2.1.99",
  "1.2.840.10008.1.2.5",
  "1.2.840.10008.1.2.4.50",
  "1.2.840.10008.1.2.4.51",
  "1.2.840.10008.1.2.4.57",
  "1.2.840.10008.1.2.4.70",
  "1.2.840.10008.1.2.4.80",
  "1.2.840.10008.1.2.4.81",
  "1.2.840.10008.1.2.4.90",
  "1.2.840.10008.1.2.4.91",
  "1.2.840.10008.1.2.4.201",
  "1.2.840.10008.1.2.4.202",
  "1.2.840.10008.1.2.4.203",
]);

export function isDicomPart10(buffer: Buffer) {
  if (buffer.length < 132) return false;
  if (buffer.toString("ascii", 128, 132) === "DICM") return true;
  if (buffer.length < 256) return false;
  try {
    dicomParser.parseDicom(new Uint8Array(buffer), { untilTag: "x00020010" });
    return true;
  } catch {
    return false;
  }
}

export function describeDicomValidation(buffer: Buffer) {
  if (buffer.length === 0) return "The stored object is empty.";
  if (buffer.length < 132) {
    return `The stored object is too small to be a DICOM Part-10 file (${buffer.length} bytes).`;
  }
  if (buffer.toString("ascii", 128, 132) !== "DICM") {
    return "The stored object is not a valid DICOM file; missing DICM marker at byte 128 and could not be parsed as raw DICOM.";
  }
  return "The stored object is not a valid DICOM file.";
}

export function readDicomSortMetadata(buffer: Buffer): DicomSortMetadata {
  try {
    const dataSet = dicomParser.parseDicom(new Uint8Array(buffer), {
      untilTag: "x7fe00010",
    });
    const x = dataSet.floatString("x00200032", 0);
    const y = dataSet.floatString("x00200032", 1);
    const z = dataSet.floatString("x00200032", 2);

    return {
      studyUid: dataSet.string("x0020000D")?.trim(),
      seriesUid: dataSet.string("x0020000E")?.trim(),
      sopInstanceUid: dataSet.string("x00080018")?.trim(),
      acquisitionNumber: dataSet.intString("x00200012"),
      instanceNumber: dataSet.intString("x00200013"),
      seriesNumber: dataSet.intString("x00200011"),
      seriesDescription: dataSet.string("x0008103E")?.trim(),
      studyDescription: dataSet.string("x00081030")?.trim(),
      imagePosition:
        x !== undefined && y !== undefined && z !== undefined ? [x, y, z] : undefined,
      sliceLocation: dataSet.floatString("x00201041"),
      transferSyntaxUid: dataSet.string("x00020010")?.trim(),
      hasPixelData: Boolean(dataSet.elements.x7fe00010),
      modality: dataSet.string("x00080060")?.trim(),
      patientName: dataSet.string("x00100010")?.trim(),
      patientId: dataSet.string("x00100020")?.trim(),
      description: dataSet.string("x00081030")?.trim(),
      studyDate: dataSet.string("x00080020")?.trim(),
    };
  } catch {
    return {};
  }
}

export function isSupportedDicomImage(metadata: DicomSortMetadata) {
  if (metadata.hasPixelData === false) return false;
  if (!metadata.transferSyntaxUid) return true;
  return SUPPORTED_TRANSFER_SYNTAXES.has(metadata.transferSyntaxUid);
}

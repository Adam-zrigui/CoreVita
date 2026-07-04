import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { formatUnknownError } from "@/lib/format-error";
import type { DicomSortMetadata } from "@/lib/dicom-validation";

type StorageDriver = "b2";
type SdkBody = {
  transformToByteArray?: () => Promise<Uint8Array>;
  transformToWebStream?: () => ReadableStream;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  stream?: () => ReadableStream;
};

export function getStorageDriver(): StorageDriver {
  const driver = process.env.DICOM_STORAGE_DRIVER;
  if (driver === "b2") return "b2";
  return "b2";
}

export function getB2Client() {
  const endpoint = process.env.DICOM_S3_ENDPOINT;
  const region = process.env.DICOM_S3_REGION;
  const accessKeyId = process.env.DICOM_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DICOM_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestHandler: { requestTimeout: 30_000 },
  });
}

export async function uploadToB2(key: string, body: Buffer | Uint8Array | NodeJS.ReadableStream, contentType = "application/dicom") {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) throw new Error("B2 client not configured");
  const maxAttempts = 3;
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const uploadBody = Buffer.isBuffer(body) || body instanceof Uint8Array
        ? Readable.from(Buffer.from(body))
        : body;
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: uploadBody as unknown as PutObjectCommandInput["Body"],
          ContentType: contentType,
        },
      });
      await upload.done();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      break;
    }
  }
  throw new Error(`B2 upload failed: ${formatUnknownError(lastErr)}`);
}

async function readNodeStream(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readWebStream(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks: Buffer[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

function isReadableWebStream(body: unknown): body is ReadableStream {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as any).getReader === "function" &&
    typeof (body as any).tee === "function"
  );
}

async function readSdkBody(body: unknown) {
  if (!body) return null;
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (body instanceof Readable) return readNodeStream(body);
  if (isReadableWebStream(body)) return readWebStream(body);

  const sdkBody = body as SdkBody;
  if (typeof sdkBody.arrayBuffer === "function") {
    return Buffer.from(await sdkBody.arrayBuffer());
  }
  if (typeof sdkBody.stream === "function") {
    return readWebStream(sdkBody.stream());
  }
  if (typeof sdkBody.transformToByteArray === "function") {
    return Buffer.from(await sdkBody.transformToByteArray());
  }
  if (typeof sdkBody.transformToWebStream === "function") {
    return readWebStream(sdkBody.transformToWebStream());
  }

  throw new Error("Unsupported B2 response body type");
}

export async function getB2SignedUrl(key: string, ttlSeconds = 900) {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) return null;
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

export async function getFromB2(key: string) {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) throw new Error("B2 client not configured");
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = result.Body;
  const buffer = await readSdkBody(body);
  if (!buffer) return null;
  return { buffer, contentType: result.ContentType ?? "application/dicom" };
}

export async function getB2Prefix(key: string, byteCount = 132) {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) throw new Error("B2 client not configured");
  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=0-${Math.max(byteCount - 1, 0)}`,
    })
  );
  return readSdkBody(result.Body);
}

function metaKey(storageKey: string) {
  return `${storageKey}.meta.json`;
}

export async function uploadDicomMetadata(storageKey: string, metadata: DicomSortMetadata) {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) return;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: metaKey(storageKey),
      Body: JSON.stringify(metadata),
      ContentType: "application/json",
    })
  ).catch((e) => console.error("[storage] metadata cleanup failed:", e));
}

export async function getDicomMetadata(storageKey: string): Promise<DicomSortMetadata | null> {
  const client = getB2Client();
  const bucket = process.env.DICOM_S3_BUCKET;
  if (!client || !bucket) return null;
  const meta = metaKey(storageKey);
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: meta }));
    const buffer = await readSdkBody(result.Body);
    if (!buffer) return null;
    return JSON.parse(buffer.toString("utf8")) as DicomSortMetadata;
  } catch {
    return null;
  }
}

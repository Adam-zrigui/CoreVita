import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { formatUnknownError } from "@/lib/format-error";
import type { DicomSortMetadata } from "@/lib/dicom-validation";

type StorageDriver = "b2" | "vercel-blob";
type SdkBody = {
  transformToByteArray?: () => Promise<Uint8Array>;
  transformToWebStream?: () => ReadableStream;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  stream?: () => ReadableStream;
};

export function getStorageDriver(): StorageDriver {
  const driver = process.env.DICOM_STORAGE_DRIVER?.trim();
  if (driver === "vercel-blob") return "vercel-blob";
  return "b2";
}

export function getB2Client() {
  const endpoint = process.env.DICOM_S3_ENDPOINT?.trim();
  const region = process.env.DICOM_S3_REGION?.trim();
  const accessKeyId = process.env.DICOM_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.DICOM_S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestHandler: { requestTimeout: 30_000 },
  });
}

function getBucket() {
  return process.env.DICOM_S3_BUCKET?.trim();
}

export async function uploadToB2(key: string, body: Buffer | Uint8Array | NodeJS.ReadableStream, contentType = "application/dicom") {
  const driver = getStorageDriver();
  if (driver === "vercel-blob") {
    return uploadToVercelBlob(key, body, contentType);
  }
  const client = getB2Client();
  const bucket = getBucket();
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
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return getVercelBlobSignedUrl(key, ttlSeconds);
  const client = getB2Client();
  const bucket = getBucket();
  if (!client || !bucket) return null;
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

export async function getB2PutSignedUrl(key: string, ttlSeconds = 3600) {
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return getVercelBlobPutSignedUrl(key, ttlSeconds);
  const client = getB2Client();
  const bucket = getBucket();
  if (!client || !bucket) return null;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "application/dicom" });
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

export function generateStorageKey(originalName: string): string {
  const ext = originalName.endsWith(".dcm") ? ".dcm" : "";
  return `uploads/${randomUUID()}${ext}`;
}

export async function getFromB2(key: string) {
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return getFromVercelBlob(key);
  const client = getB2Client();
  const bucket = getBucket();
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
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return getVercelBlobPrefix(key, byteCount);
  const client = getB2Client();
  const bucket = getBucket();
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
  const driver = getStorageDriver();
  if (driver === "vercel-blob") {
    return uploadDicomMetadataToVercelBlob(storageKey, metadata);
  }
  const client = getB2Client();
  const bucket = getBucket();
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
  const driver = getStorageDriver();
  if (driver === "vercel-blob") return getDicomMetadataFromVercelBlob(storageKey);
  const client = getB2Client();
  const bucket = getBucket();
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

// Vercel Blob implementation

async function getVercelBlobClient() {
  const mod = await import("@vercel/blob");
  return mod;
}

async function uploadToVercelBlob(key: string, body: Buffer | Uint8Array | NodeJS.ReadableStream, contentType = "application/dicom") {
  const vb = await getVercelBlobClient();
  const blobBody = Buffer.isBuffer(body)
    ? body
    : body instanceof Uint8Array
      ? Buffer.from(body)
      : await readNodeStream(body as Readable);
  await vb.put(key, blobBody, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
}

async function getFromVercelBlob(key: string) {
  const vb = await getVercelBlobClient();
  const info = await vb.head(key).catch((e) => {
    console.error(`[vercel-blob] head failed for key "${key}":`, e);
    return null;
  });
  if (!info) {
    console.error(`[vercel-blob] head returned null for key "${key}"`);
    return null;
  }
  const result = await vb.get(key, { access: "public" }).catch((e) => {
    console.error(`[vercel-blob] get failed for key "${key}":`, e);
    return null;
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    console.error(`[vercel-blob] get returned status ${result?.statusCode} for key "${key}"`);
    return null;
  }
  const buffer = await readWebStream(result.stream);
  return { buffer, contentType: info.contentType ?? "application/dicom" };
}

async function getVercelBlobPrefix(key: string, byteCount = 132) {
  const vb = await getVercelBlobClient();
  const info = await vb.head(key);
  if (!info) return null;
  const response = await fetch(info.url, {
    headers: { Range: `bytes=0-${Math.max(byteCount - 1, 0)}` },
  });
  if (!response.ok) return null;
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getVercelBlobSignedUrl(key: string, ttlSeconds = 900) {
  try {
    const vb = await getVercelBlobClient();
    const signedToken = await vb.issueSignedToken({
      pathname: key,
      operations: ["get"],
      validUntil: Date.now() + ttlSeconds * 1000,
    });
    const { presignedUrl } = await vb.presignUrl(signedToken, { operation: "get", pathname: key, access: "public" });
    return presignedUrl;
  } catch {
    return null;
  }
}

async function getVercelBlobPutSignedUrl(key: string, ttlSeconds = 3600) {
  try {
    const vb = await getVercelBlobClient();
    const signedToken = await vb.issueSignedToken({
      pathname: key,
      operations: ["put"],
      validUntil: Date.now() + ttlSeconds * 1000,
    });
    const { presignedUrl } = await vb.presignUrl(signedToken, {
      operation: "put",
      pathname: key,
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return presignedUrl;
  } catch {
    return null;
  }
}

export async function getVercelBlobDownloadUrl(key: string): Promise<string | null> {
  try {
    const vb = await getVercelBlobClient();
    const result = await vb.head(key);
    if (!result || !result.url) return null;
    const { getDownloadUrl } = await import("@vercel/blob");
    return getDownloadUrl(result.url);
  } catch {
    return null;
  }
}

async function uploadDicomMetadataToVercelBlob(storageKey: string, metadata: DicomSortMetadata) {
  const vb = await getVercelBlobClient();
  await vb.put(metaKey(storageKey), JSON.stringify(metadata), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  }).catch((e: unknown) => console.error("[storage] metadata cleanup failed:", e));
}

async function getDicomMetadataFromVercelBlob(storageKey: string): Promise<DicomSortMetadata | null> {
  const vb = await getVercelBlobClient();
  try {
    const result = await vb.get(metaKey(storageKey), { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const buffers: Uint8Array[] = [];
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffers.push(value);
    }
    const text = new TextDecoder().decode(
      buffers.length === 1 ? buffers[0] : Buffer.concat(buffers.map(b => Buffer.from(b)))
    );
    return JSON.parse(text) as DicomSortMetadata;
  } catch {
    return null;
  }
}

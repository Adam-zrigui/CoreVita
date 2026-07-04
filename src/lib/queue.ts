import { getRedis } from "@/lib/redis";
import type { QueueOptions } from "bullmq";

type UploadJobPayload = {
  studyUid: string;
  series: {
    seriesUid: string;
    seriesNumber?: number;
    modality?: string;
    sopMap?: [string, string][];
    files: { name: string; storageKey: string; driver: string; originalPath?: string; instanceNumber?: number }[];
  }[];
  patientName?: string;
  studyDate?: string;
  description?: string;
  title?: string | null;
};

export async function enqueueUpload(payload: UploadJobPayload) {
  if (process.env.DICOM_QUEUE_DRIVER !== "bullmq") return null;
  const redis = getRedis();
  if (!redis) return null;
  const { Queue } = await import("bullmq");
  const queue = new Queue<UploadJobPayload>("dicom-uploads", {
    connection: redis as unknown as QueueOptions["connection"],
  });
  return queue.add("upload", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

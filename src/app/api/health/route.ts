import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { getB2Client } from "@/lib/storage";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

async function check<T>(fn: () => Promise<T>, okValue: string, failValue: string): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    await fn();
    return { status: okValue, latency: Date.now() - start };
  } catch {
    return { status: failValue, latency: Date.now() - start };
  }
}

export async function GET() {
  const [database, redis, storage, auth] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`, "ok", "unreachable"),
    check(async () => { const r = getRedis(); if (r) await r.ping(); else throw new Error("not-configured"); }, "ok", getRedis() ? "unreachable" : "not-configured"),
    check(async () => { const b = getB2Client(); if (b) await b.send(new ListBucketsCommand({})); else throw new Error("not-configured"); }, "ok", getB2Client() ? "unreachable" : "not-configured"),
    check(() => { const a = getAdminAuth(); if (!a) throw new Error("not-configured"); return Promise.resolve(); }, "ok", getAdminAuth() ? "unreachable" : "not-configured"),
  ]);

  const checks = { database: database.status, redis: redis.status, storage: storage.status, firebase: auth.status };
  const healthy = Object.values(checks).every((v) => v === "ok");
  const uptime = process.uptime();

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", uptime, checks, latencies: { database: database.latency, redis: redis.latency, storage: storage.latency, firebase: auth.latency } },
    { status: healthy ? 200 : 503 },
  );
}

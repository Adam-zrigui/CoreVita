import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/plans";
import { getActorTenant } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { getB2PutSignedUrl, generateStorageKey, getStorageDriver } from "@/lib/storage";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1),
    size: z.number().positive(),
  })).min(1).max(500),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = rateLimit(`presign:${session.user.id}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });
    }

    const planInfo = await getCurrentPlan(session);
    if (planInfo.plan === "starter" && planInfo.used >= planInfo.limit) {
      return NextResponse.json({ error: "Study limit reached. Upgrade to upload more." }, { status: 403 });
    }

    const actorInfo = await getActorTenant(session);
    if (actorInfo instanceof Response) return actorInfo;

    const body = await req.json();
    const parsed = bodySchema.parse(body);

    const entries = await Promise.all(parsed.files.map(async (file) => {
      const storageKey = generateStorageKey(file.name);
      const uploadUrl = await getB2PutSignedUrl(storageKey);
      return {
        name: file.name,
        size: file.size,
        storageKey,
        uploadUrl,
      };
    }));

    return NextResponse.json({ entries, tenantId: actorInfo.tenantId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[upload/presign] failed:", msg, error instanceof Error ? error.stack : "");
    return NextResponse.json({ error: `Failed to generate upload URLs: ${msg}` }, { status: 500 });
  }
}

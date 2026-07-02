import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { z } from "zod";

const createKeySchema = z.object({ name: z.string().min(1).max(200) });

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `cv_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!membership) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const plan = await getCurrentPlan(session);
  if (!planHasFeature(plan.plan, "api_access")) {
    return NextResponse.json({ error: "API access requires the Clinic plan" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { tenantId: membership.tenantId },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!membership) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const plan = await getCurrentPlan(session);
  if (!planHasFeature(plan.plan, "api_access")) {
    return NextResponse.json({ error: "API access requires the Clinic plan" }, { status: 403 });
  }

  let name: string;
  try {
    const parsed = createKeySchema.parse(await request.json());
    name = parsed.name;
  } catch {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { raw, prefix, hash } = generateApiKey();

  await prisma.apiKey.create({
    data: { tenantId: membership.tenantId, name: name.trim(), prefix, hash },
  });

  return NextResponse.json({ key: raw, prefix, name: name.trim() });
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { tenantId: true },
  });
  if (!membership) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Key ID is required" }, { status: 400 });

  const key = await prisma.apiKey.findFirst({
    where: { id, tenantId: membership.tenantId },
  });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ revoked: true });
}

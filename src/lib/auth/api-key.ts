import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function validateApiKey(rawKey: string) {
  const hash = hashApiKey(rawKey);
  const key = await prisma.apiKey.findUnique({ where: { hash } });
  if (!key) return null;

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch((e) => console.error("[api-key] lastUsedAt update failed:", e));

  const memberships = await prisma.membership.findMany({
    where: { tenantId: key.tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return { key, tenantId: key.tenantId, memberships };
}

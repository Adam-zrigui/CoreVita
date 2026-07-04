import { prisma } from "@/lib/prisma";
import { formatUnknownError } from "@/lib/format-error";

export async function ensureUserTenant(userId: string): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { tenant: true },
  });

  if (memberships.length > 0) {
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG ?? "default";
    const allOnDefault = memberships.every((m) => m.tenant.slug === defaultSlug);
    if (!allOnDefault) return;
  }

  const slug = `user-${userId}`;
  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "My Workspace", slug },
    });
  }
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId, tenantId: tenant.id } },
    update: {},
    create: { userId, tenantId: tenant.id },
  });
}

export { prisma };

export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, 400 * i));
        continue;
      }
    }
  }
  throw new Error(formatUnknownError(lastErr, "Database operation failed"));
}

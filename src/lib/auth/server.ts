import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";

export type AppRole = "ADMIN" | "RADIOLOGIST" | "ASSISTANT" | "VIEWER";

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: AppRole;
  } | null;
}

export async function getServerSession(): Promise<AuthSession> {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return { user: null };

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) return { user: null };

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;
    if (!uid) return { user: null };

    const tenant = await getDefaultTenant();

    const email = decodedClaims.email ?? null;
    let user = await prisma.user.findUnique({ where: { id: uid } });
    if (user) {
      user = await prisma.user.update({
        where: { id: uid },
        data: { name: decodedClaims.name, email, image: decodedClaims.picture },
      });
    } else {
      user = await prisma.user.create({
        data: { id: uid, name: decodedClaims.name, email, image: decodedClaims.picture },
      });
    }

    let membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    });
    if (!membership) {
      membership = await prisma.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "VIEWER" },
      });
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: (membership.role as AppRole) ?? "VIEWER",
      },
    };
  } catch (error) {
    console.error("[auth/server] getServerSession failed:", error);
    return { user: null };
  }
}

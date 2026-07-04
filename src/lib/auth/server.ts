import { cache } from "react";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { ensureUserTenant } from "@/lib/db";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-__session" : "__session";

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

async function getServerSessionImpl(): Promise<AuthSession> {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return { user: null };

    const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
    ?? cookieStore.get("__Host-__session")?.value
    ?? cookieStore.get("__session")?.value;

    if (!sessionCookie) return { user: null };
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;
    if (!uid) return { user: null };

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

    await ensureUserTenant(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    };
  } catch (error) {
    console.error("[auth/server] getServerSession failed:", error);
    return { user: null };
  }
}

export const getServerSession = cache(getServerSessionImpl);

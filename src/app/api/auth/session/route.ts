import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const sessionSchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  let idToken: string;
  try {
    const body = await request.json();
    const parsed = sessionSchema.parse(body);
    idToken = parsed.idToken;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return Response.json({ error: "Firebase Admin not configured" }, { status: 500 });
  }

  let decoded: { uid: string; email?: string; name?: string; picture?: string };
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[auth/session] verifyIdToken failed:", error);
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const { uid, email, name, picture } = decoded;

  const signInProvider = (decoded as any).firebase?.sign_in_provider;
  const emailVerified = (decoded as any).email_verified;
  if (signInProvider === "password" && !emailVerified) {
    return Response.json({ error: "Please verify your email before signing in." }, { status: 403 });
  }

  let tenant: { id: string };
  try {
    tenant = await getDefaultTenant();
  } catch (error) {
    console.error("[auth/session] getDefaultTenant failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  let resolvedUserId = uid;
  try {
    let user = await prisma.user.findUnique({ where: { id: uid } });
    if (user) {
      user = await prisma.user.update({
        where: { id: uid },
        data: { name, email, image: picture },
      });
    } else {
      user = await prisma.user.create({
        data: { id: uid, name, email, image: picture },
      });
    }
    resolvedUserId = user.id;
  } catch (error) {
    console.error("[auth/session] user upsert failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: resolvedUserId, tenantId: tenant.id } },
      update: {},
      create: { userId: resolvedUserId, tenantId: tenant.id, role: "VIEWER" },
    });
  } catch (error) {
    console.error("[auth/session] membership upsert failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  } catch (error) {
    console.error("[auth/session] createSessionCookie failed:", error);
    return Response.json({ error: "Session creation failed" }, { status: 500 });
  }

  try {
    const cookieStore = await cookies();
    const sameSite = (process.env.COOKIE_SAMESITE || "lax") as "lax" | "none" | "strict";
    cookieStore.set("__Host-__session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite,
      path: "/",
      maxAge: expiresIn / 1000,
    });
  } catch (error) {
    console.error("[auth/session] Cookie set failed:", error);
    return Response.json({ error: "Cookie error" }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE() {
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("__session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        await adminAuth.revokeRefreshTokens(decoded.uid);
      }
    } catch (e) {
      console.error("[auth/session] Token revocation failed:", e);
    }
  }

  const cookieStore = await cookies();
  const sameSite = (process.env.COOKIE_SAMESITE || "lax") as "lax" | "none" | "strict";
  cookieStore.set("__Host-__session", "", {
    httpOnly: true,
    secure: true,
    sameSite,
    path: "/",
    maxAge: 0,
  });
  return Response.json({ success: true });
}

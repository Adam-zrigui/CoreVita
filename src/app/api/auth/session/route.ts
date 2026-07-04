import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { ensureUserTenant } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-__session" : "__session";
const sessionSchema = z.object({ idToken: z.string().min(1) });

function serializeCookie(name: string, value: string, options: { path: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" | "none" }) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.round(options.maxAge)}`);
  parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function buildCookieHeader(name: string, value: string, isProd: boolean, sameSite: "lax" | "strict" | "none", maxAge: number) {
  return serializeCookie(name, value, {
    path: "/",
    maxAge,
    httpOnly: true,
    secure: isProd,
    sameSite,
  });
}

function buildDeleteCookieHeader(name: string, isProd: boolean, sameSite: "lax" | "strict" | "none") {
  return serializeCookie(name, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: isProd,
    sameSite,
  });
}

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

  let decoded: Record<string, unknown>;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("[auth/session] verifyIdToken failed:", error);
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const uid = decoded.uid as string;
  const email = decoded.email as string | undefined;
  const name = decoded.name as string | undefined;
  const picture = decoded.picture as string | undefined;

  const signInProvider = typeof decoded.firebase === "object" && decoded.firebase !== null ? (decoded.firebase as Record<string, unknown>).sign_in_provider as string | undefined : undefined;
  const emailVerified = typeof decoded.email_verified === "boolean" ? decoded.email_verified : undefined;
  if (signInProvider === "password" && !emailVerified) {
    return Response.json({ error: "Please verify your email before signing in." }, { status: 403 });
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
    await ensureUserTenant(resolvedUserId);
  } catch (error) {
    console.error("[auth/session] ensureUserTenant failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  } catch (error) {
    console.error("[auth/session] createSessionCookie failed:", error);
    return Response.json({ error: "Session creation failed" }, { status: 500 });
  }

  const cookieHeaders: string[] = [];
  try {
    const isProd = process.env.NODE_ENV === "production";
    const sameSiteRaw = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
    const sameSite = sameSiteRaw === "none" && !isProd ? "lax" : (sameSiteRaw as "lax" | "none" | "strict");
    const cookieNames = new Set([SESSION_COOKIE_NAME, "__session"]);
    if (isProd) {
      cookieNames.add("__Host-__session");
    }
    for (const name of cookieNames) {
      cookieHeaders.push(buildCookieHeader(name, sessionCookie, isProd, sameSite, expiresIn / 1000));
    }
  } catch (error) {
    console.error("[auth/session] Cookie set failed:", error);
    return Response.json({ error: "Cookie error" }, { status: 500 });
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  cookieHeaders.forEach((header) => headers.append("Set-Cookie", header));
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}

export async function DELETE() {
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("__Host-__session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        await adminAuth.revokeRefreshTokens(decoded.uid);
      }
    } catch (e) {
      console.error("[auth/session] Token revocation failed:", e);
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const sameSiteRaw = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const sameSite = sameSiteRaw === "none" && !isProd ? "lax" : (sameSiteRaw as "lax" | "none" | "strict");
  const cookieNames = new Set([SESSION_COOKIE_NAME, "__session"]);
  if (isProd) {
    cookieNames.add("__Host-__session");
  }
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const name of cookieNames) {
    headers.append("Set-Cookie", buildDeleteCookieHeader(name, isProd, sameSite));
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}

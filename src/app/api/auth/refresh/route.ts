import { getAdminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-__session" : "__session";

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

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return Response.json({ error: "Missing idToken" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return Response.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }

    await adminAuth.verifyIdToken(idToken);

    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const isProd = process.env.NODE_ENV === "production";
    const sameSite = (process.env.COOKIE_SAMESITE || "lax") as "lax" | "none" | "strict";
    const cookieNames = new Set([SESSION_COOKIE_NAME, "__session"]);
    if (isProd) {
      cookieNames.add("__Host-__session");
    }

    const headers = new Headers({ "Content-Type": "application/json" });
    for (const name of cookieNames) {
      headers.append("Set-Cookie", buildCookieHeader(name, sessionCookie, isProd, sameSite, expiresIn / 1000));
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    console.error("[auth/refresh] Failed to refresh session:", error);
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}

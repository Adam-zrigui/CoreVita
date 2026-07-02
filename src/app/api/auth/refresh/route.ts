import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

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

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";
    const sameSite = (process.env.COOKIE_SAMESITE || (isProd ? "lax" : "lax")) as "lax" | "none" | "strict";
    cookieStore.set("__session", sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[auth/refresh] Failed to refresh session:", error);
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }
}

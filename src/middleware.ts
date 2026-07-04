import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-__session" : "__session";
const PROTECTED_PATHS = ["/dashboard", "/studies", "/upload", "/viewer", "/settings"];
const ALLOWED_ORIGINS = new Set([
  process.env.CORS_ORIGIN,
  process.env.NEXTAUTH_URL,
  process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`,
].filter(Boolean) as string[]);

const AUTH_PATHS = ["/api/auth/session", "/api/auth/register", "/api/auth/refresh"];

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad === 2 ? `${normalized}==` : pad === 3 ? `${normalized}=` : pad === 1 ? "" : normalized;
  return atob(padded);
}

function isCookieExpired(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const payload = value.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(decodeBase64Url(payload));
    return decoded.exp ? decoded.exp * 1000 < Date.now() : true;
  } catch {
    return true;
  }
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const AUTH_MAX_REQUESTS = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, WINDOW_MS * 2);

function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetIn: WINDOW_MS };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetIn: Math.max(0, entry.resetAt - now) };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetIn: Math.max(0, entry.resetAt - now) };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first !== "unknown" && first !== "127.0.0.1" && first !== "::1") {
      return first;
    }
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const reqUrl = new URL(request.url);
    if (originHost === reqUrl.host) return true;
    for (const allowed of ALLOWED_ORIGINS) {
      try {
        if (new URL(allowed).host === originHost) return true;
      } catch {}
    }
  } catch {}
  return false;
}

const CSRF_EXEMPT_PATHS = new Set(["/api/stripe/webhook"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const isAllowedOrigin = !origin || isSameOrigin(request);
    const corsHeaders: Record<string, string> = {};
    if (isAllowedOrigin && origin) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
      corsHeaders["Vary"] = "Origin";
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (["POST", "PUT", "PATCH"].includes(request.method) && !pathname.startsWith("/api/upload")) {
      const contentLength = request.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
        return new NextResponse(JSON.stringify({ error: "Request too large" }), {
          status: 413,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);
    if (isStateChanging && !CSRF_EXEMPT_PATHS.has(pathname)) {
      const referer = request.headers.get("referer");
      const origin = request.headers.get("origin");
      const hasValidOrigin = origin ? isSameOrigin(request) : true;
      const hasValidReferer = !referer || isSameOrigin(request);
      if (!hasValidOrigin || !hasValidReferer) {
        return new NextResponse(JSON.stringify({ error: "CSRF validation failed" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
    const ip = getClientIp(request);
    const rlKey = `${request.method}:${pathname}:${ip}`;
    const maxRl = isAuth ? AUTH_MAX_REQUESTS : MAX_REQUESTS;
    const result = checkRateLimit(rlKey, maxRl);

    const response = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetIn));
    response.headers.set("X-API-Version", "1.0.0");

    if (!result.allowed) {
      return new NextResponse(JSON.stringify({ error: isAuth ? "Too many attempts. Try again later." : "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
          ...corsHeaders,
        },
      });
    }

    return response;
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
    ?? request.cookies.get("__Host-__session")?.value
    ?? request.cookies.get("__session")?.value;
  const isAuthenticated = !isCookieExpired(sessionCookie);
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Do not auto-redirect auth pages based on a cookie-only check.
  // This prevents redirect loops when the session cookie is present but invalid.
  const response = NextResponse.next();
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.firebaseio.com https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.firebaseio.com https://identitytoolkit.googleapis.com wss://*.firebaseio.com; font-src 'self' data:; frame-src 'self' https://*.firebaseio.com https://apis.google.com; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/upload/:path*",
    "/viewer/:path*",
    "/studies/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/reset-password",
  ],
};

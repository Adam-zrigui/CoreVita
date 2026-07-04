import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const names = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);

  const present = {
    "__session": names.includes("__session"),
    "__Host-__session": names.includes("__Host-__session"),
  };

  return new NextResponse(JSON.stringify({ present, names }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

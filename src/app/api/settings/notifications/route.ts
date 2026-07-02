import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    email: prefs?.email ?? true,
    browser: prefs?.browser ?? true,
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, browser } = await request.json();

  if (typeof email !== "boolean" || typeof browser !== "boolean") {
    return NextResponse.json({ error: "email and browser must be booleans" }, { status: 400 });
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, email, browser },
    update: { email, browser },
  });

  return NextResponse.json({ email: prefs.email, browser: prefs.browser });
}

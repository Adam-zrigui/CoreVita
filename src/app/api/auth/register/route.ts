import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { ensureUserTenant } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`register:${ip}`, 3, 60_000);
    if (!rl.allowed) {
      return Response.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = registerSchema.parse(body);
    const { idToken, name } = parsed;

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return Response.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const { uid, email, picture } = decoded;

    if (!email) {
      return Response.json({ error: "Email is required for registration" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { id: uid } });
    if (user) {
      user = await prisma.user.update({
        where: { id: uid },
        data: { name: name ?? decoded.name, email, image: picture },
      });
    } else {
      user = await prisma.user.create({
        data: { id: uid, name: name ?? decoded.name, email, image: picture },
      });
    }

    await ensureUserTenant(user.id);

    return Response.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("[auth/register] Failed:", error);
    if (error instanceof Error && error.message.includes("Firebase")) {
      return Response.json({ error: "Registration failed" }, { status: 401 });
    }
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}

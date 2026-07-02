import { getAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  try {
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

    const tenant = await getDefaultTenant();

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

    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: {},
      create: { userId: user.id, tenantId: tenant.id, role: "ADMIN" },
    });

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

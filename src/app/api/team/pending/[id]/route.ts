import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { memberships: { take: 1 } },
  });
  const tenantId = user?.memberships[0]?.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const invite = await prisma.pendingInvite.findUnique({ where: { id } });
  if (!invite || invite.tenantId !== tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.pendingInvite.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

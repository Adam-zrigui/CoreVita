import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getB2Prefix } from "@/lib/storage";
import { readDicomEquipmentMetadata, type DicomEquipmentMetadata } from "@/lib/dicom-equipment";
import { signDicomToken } from "@/lib/signing";

export const runtime = "nodejs";

const EQUIPMENT_PREFIX_BYTES = 4096;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.shareToken.findUnique({
      where: { token },
      include: { study: { select: { tenantId: true } } },
    });

    if (!share) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, tenantId: share.study.tenantId },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.shareToken.delete({ where: { id: share.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { expiresInDays } = await req.json();

    if (!expiresInDays || typeof expiresInDays !== "number" || expiresInDays < 1) {
      return NextResponse.json({ error: "Invalid expiry days" }, { status: 400 });
    }

    const share = await prisma.shareToken.findUnique({
      where: { token },
      include: { study: { select: { tenantId: true } } },
    });

    if (!share) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, tenantId: share.study.tenantId },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: share.study.tenantId },
      select: { priceId: true },
    });

    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
    const plan = subscription?.priceId === clinicPriceId ? "enterprise"
      : subscription?.priceId === proPriceId ? "pro"
      : "starter";

    const maxDays = plan === "starter" ? 7 : 365;

    if (expiresInDays > maxDays) {
      return NextResponse.json({
        error: `Maximum expiry is ${maxDays} days for your plan`,
      }, { status: 403 });
    }

    const newExpiresAt = new Date(Date.now() + expiresInDays * 86400000);

    await prisma.shareToken.update({
      where: { id: share.id },
      data: { expiresAt: newExpiresAt },
    });

    return NextResponse.json({
      success: true,
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    console.error("[share/PATCH] Failed to extend:", error);
    return NextResponse.json({ error: "Failed to extend share link" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.shareToken.findUnique({
      where: { token },
      include: {
        study: {
          include: {
            series: {
              orderBy: [{ seriesNumber: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
              select: {
                id: true,
                seriesUid: true,
                modality: true,
                instanceCount: true,
                instances: {
                  select: {
                    id: true,
                    storageDriver: true,
                    storageKey: true,
                    instanceNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    if (share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    const study = share.study;
    const passwordParam = req.nextUrl.searchParams.get("password");

    if (share.password) {
      if (!passwordParam) {
        return NextResponse.json({ requiresPassword: true }, { status: 200 });
      }
      const hash = crypto.createHash("sha256").update(passwordParam).digest("hex");
      if (hash !== share.password) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
      }
    }

    const allowedStorage = share.allowDownload ? undefined : "b2";
    const origin = req.nextUrl.origin;
    const filteredInstances = study.series.map((s) =>
      s.instances.filter((i) => !allowedStorage || i.storageDriver === allowedStorage)
    );

    const equipment = await Promise.all(
      study.series.map(async (s) => {
        const first = s.instances[0];
        if (!first || first.storageDriver !== "b2") return {};
        const prefix = await getB2Prefix(first.storageKey, EQUIPMENT_PREFIX_BYTES).catch(() => null);
        return prefix ? readDicomEquipmentMetadata(prefix) : {};
      })
    );

    const ttlBase = Number(process.env.DICOM_URL_TTL_SECONDS ?? 900);
    const remainingMs = share.expiresAt.getTime() - Date.now();
    const ttlSeconds = Math.min(
      Math.max(Math.floor(remainingMs / 1000), ttlBase),
      7 * 86400
    );

    const b2InstanceIds = filteredInstances
      .flat()
      .filter((i) => i.storageDriver === "b2")
      .map((i) => i.id);

    const imageIds: string[] = [];
    for (const id of b2InstanceIds) {
      const token = signDicomToken(id, ttlSeconds);
      if (token) {
        imageIds.push(`wadouri:${origin}/api/dicom/instance/${id}?token=${token}`);
      }
    }

    const series = study.series.map((s, i) => {
      const first = filteredInstances[i]?.[0];
      let firstImageId: string | null = null;
      if (first && first.storageDriver === "b2") {
        const token = signDicomToken(first.id, ttlSeconds);
        if (token) {
          firstImageId = `wadouri:${origin}/api/dicom/instance/${first.id}?token=${token}`;
        }
      }
      return {
        id: s.id,
        seriesUid: s.seriesUid,
        modality: s.modality,
        instanceCount: s.instanceCount,
        firstImageId,
        equipment: equipment[i] ?? {},
      };
    });

    const instances = filteredInstances.flat().map((i) => {
      let signedUrl: string | null = null;
      if (i.storageDriver === "b2") {
        const token = signDicomToken(i.id, ttlSeconds);
        if (token) {
          signedUrl = `${origin}/api/dicom/instance/${i.id}?token=${token}`;
        }
      }
      return {
        id: i.id,
        storageDriver: i.storageDriver,
        storageKey: i.storageKey,
        instanceNumber: i.instanceNumber,
        signedUrl,
      };
    });

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: study.tenantId },
      select: { priceId: true },
    });
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const clinicPriceId = process.env.STRIPE_CLINIC_PRICE_ID;
    const plan = subscription?.priceId === clinicPriceId ? "enterprise"
      : subscription?.priceId === proPriceId ? "pro"
      : "starter";

    return NextResponse.json({
      plan,
      share: {
        token: share.token,
        expiresAt: share.expiresAt,
        allowDownload: share.allowDownload,
        hasPassword: !!share.password,
      },
      study: {
        studyUid: study.studyUid,
        patientName: study.patientName,
        studyDate: study.studyDate,
        description: study.description,
        modality: study.modality,
        series,
      },
      instances,
      imageIds,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load shared study" }, { status: 500 });
  }
}

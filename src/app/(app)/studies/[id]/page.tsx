import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActorTenant } from "@/lib/rbac";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { StudyDetail } from "./StudyDetail";

export const dynamic = "force-dynamic";

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const actorInfo = await getActorTenant();
  if (actorInfo instanceof Response) notFound();

  const study = await prisma.study.findFirst({
    where: { OR: [{ id }, { studyUid: id }], tenantId: actorInfo.tenantId, uploadedById: actorInfo.actorId },
    include: {
      series: {
        orderBy: [{ seriesNumber: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        select: {
          id: true,
          seriesUid: true,
          modality: true,
          instanceCount: true,
          seriesNumber: true,
          _count: { select: { instances: true } },
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
      shareTokens: {
        select: {
          id: true,
          token: true,
          expiresAt: true,
          password: true,
          allowDownload: true,
          createdAt: true,
        },
      },
    },
  });

  if (!study) notFound();

  const planInfo = await getCurrentPlan();
  const hasAiFeature = planHasFeature(planInfo.plan, "ai_triage");
  const hasStructuredReports = planHasFeature(planInfo.plan, "structured_reports");

  return <StudyDetail study={study} plan={planInfo.plan} hasAiFeature={hasAiFeature} hasStructuredReports={hasStructuredReports} />;
}

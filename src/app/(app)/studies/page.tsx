import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActorTenant } from "@/lib/rbac";
import { StudiesGrid } from "./StudiesGrid";

export const dynamic = "force-dynamic";
const PER_PAGE = 12;

export default async function StudiesPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const actorInfo = await getActorTenant();
  if (actorInfo instanceof Response) notFound();
  const tenantId = actorInfo.tenantId;

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where: { tenantId, uploadedById: actorInfo.actorId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        studyUid: true,
        patientName: true,
        title: true,
        patientId: true,
        modality: true,
        studyDate: true,
        slices: true,
        status: true,
        description: true,
        createdAt: true,
        _count: { select: { series: true, reports: true, shareTokens: { where: { expiresAt: { gt: new Date() } } } } },
      },
    }),
    prisma.study.count({ where: { tenantId, uploadedById: actorInfo.actorId } }),
  ]);

  const seriesCount = studies.reduce((sum, s) => sum + s._count.series, 0);
  const totalShares = studies.reduce((sum, s) => sum + s._count.shareTokens, 0);
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Studies</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} study{total !== 1 ? "ies" : "y"} &middot; {seriesCount} series
            {totalShares > 0 && <span> &middot; {totalShares} shared</span>}
          </p>
        </div>
      </div>
      <StudiesGrid studies={studies} page={page} totalPages={totalPages} />
    </main>
  );
}

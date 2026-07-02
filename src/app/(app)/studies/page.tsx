import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";
import { StudiesGrid } from "./StudiesGrid";

export const dynamic = "force-dynamic";
const PER_PAGE = 12;

function StudiesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full animate-pulse rounded-lg bg-white/[0.04]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded bg-white/[0.06]" />
            </div>
            <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-white/[0.04]" />
            <div className="mt-3 flex gap-4">
              <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="mt-4 h-px bg-white/[0.04]" />
            <div className="mt-3 h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function StudiesPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const tenant = await getDefaultTenant();

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        studyUid: true,
        patientName: true,
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
    prisma.study.count({ where: { tenantId: tenant.id } }),
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

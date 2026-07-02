import { Clock, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { DeleteStudyButton } from "../studies/DeleteStudyButton";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/db";

async function getRecentStudies() {
  const tenant = await getDefaultTenant();
  const studies = await prisma.study.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      studyUid: true,
      patientName: true,
      modality: true,
      slices: true,
      status: true,
      createdAt: true,
      _count: { select: { shareTokens: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return studies.map((s) => ({
    ...s,
    shareCount: s._count.shareTokens,
  }));
}

export async function RecentStudiesTableContent() {
  const studies = await getRecentStudies();

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.02] text-slate-600 mb-4">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">No studies yet</h3>
        <p className="text-xs text-slate-500 max-w-xs">Upload your first DICOM study to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <div className="max-h-80 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white/[0.02] border-b border-white/[0.06]">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Patient
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                Study UID
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                Modality
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                Shares
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                Images
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                Date
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {studies.map((study) => (
              <tr
                key={study.id}
                className="group border-b border-white/[0.03] transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3.5">
                  <Link
                    href={`/viewer/${study.studyUid}`}
                    className="text-sm font-medium text-white transition-colors hover:text-emerald-400"
                  >
                    {study.patientName ?? "Unknown"}
                  </Link>
                </td>
                <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 hidden md:table-cell max-w-[180px] truncate">
                  {study.studyUid}
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-400 hidden sm:table-cell">
                  <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono">
                    {study.modality ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-500 hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Share2 className="h-3 w-3 text-slate-600" />
                    {study.shareCount}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-500 hidden lg:table-cell tabular-nums">
                  {study.slices}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                    ${study.status === "PENDING"
                      ? "border-amber-500/20 bg-amber-500/8 text-amber-400"
                      : study.status === "READING"
                        ? "border-blue-500/20 bg-blue-500/8 text-blue-400"
                        : study.status === "REPORTED"
                          ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-400"
                          : "border-slate-500/20 bg-slate-500/8 text-slate-400"
                    }`}
                  >
                    {study.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600 hidden lg:table-cell whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-700" />
                    {formatDate(study.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/viewer/${study.studyUid}`}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-emerald-400"
                    >
                      View
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`/studies/${study.id}`}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-blue-400"
                    >
                      <Share2 className="h-3 w-3" />
                      Share
                    </Link>
                    <DeleteStudyButton studyUid={study.studyUid} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export async function RecentStudiesTable() {
  return (
    <Suspense fallback={
      <div className="overflow-hidden rounded-xl border border-white/[0.06] animate-pulse">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-24 rounded bg-white/[0.06]" />
              <div className="h-3 w-16 rounded bg-white/[0.06] hidden md:block" />
              <div className="h-3 w-12 rounded bg-white/[0.06] hidden sm:block" />
              <div className="h-5 w-16 rounded bg-white/[0.06] hidden lg:block" />
              <div className="h-4 w-16 rounded bg-white/[0.06] hidden lg:block" />
              <div className="h-4 w-8 rounded bg-white/[0.06] ml-auto" />
            </div>
          ))}
        </div>
      </div>
    }>
      <RecentStudiesTableContent />
    </Suspense>
  );
}

function formatDate(date: Date | string) {
  try {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return String(date);
  }
}

import { getServerSession } from "@/lib/auth";
import Link from "next/link";
import { getDefaultTenant } from "@/lib/db";
import { getCurrentPlan } from "@/lib/plans";
import { getDashboardData } from "@/lib/dashboard";
import { BarChart3, Users, Share2, ArrowUpRight, UploadCloud, ChevronRight } from "lucide-react";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";

export default async function DashboardPage() {
  const session = await getServerSession();
  const userName = session?.user?.name ?? null;
  const userRole = session?.user?.role ?? null;

  const tenant = await getDefaultTenant();
  const planResult = await getCurrentPlan();
  const [dashboardData] = await Promise.all([
    getDashboardData(tenant.id, 20, planResult.plan).catch(() => null),
  ]);
  const { plan, used, limit, status } = planResult;

  if (status === "none") {
    // If no plan and no session, allow access with limited features
    // If no plan but has session, redirect to pricing
    if (session?.user) {
      // redirect("/services/pricing");
    }
  }

  const { StatsCards } = await import("@/components/dashboard/StatsCards");
  const { StudyStatusSection } = await import("@/components/dashboard/StudyStatusSection");
  const { RecentStudiesTable } = await import("@/components/dashboard/RecentStudiesTable");

  const totalStudies = dashboardData?.totalStudies ?? 0;
  const recentStudies = dashboardData?.recentStudies ?? [];
  const activeShares = dashboardData?.activeShares ?? 0;
  const sharesThisMonth = dashboardData?.sharesThisMonth ?? 0;
  const recentShares = dashboardData?.recentShares ?? [];
  const usagePercent = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8 animate-fade-in">

      {plan === "starter" && usagePercent > 70 && (
        <DashboardBanner used={used} limit={limit} usagePercent={usagePercent} />
      )}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Dashboard
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {userName ? (
              <>Welcome back, <span className="text-slate-400 font-medium">{userName}</span>
                {userRole && <><span className="mx-1.5 text-slate-700">&middot;</span>
                  <span className="capitalize text-slate-500">{userRole.toLowerCase()}</span></>}</>
            ) : (
              <>Browse and manage your studies</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm ${
              plan === "pro"
                ? "border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400 shadow-emerald-500/5"
                : plan === "enterprise"
                  ? "border-violet-500/25 bg-gradient-to-r from-violet-500/15 to-violet-500/5 text-violet-400 shadow-violet-500/5"
                  : "border-amber-500/25 bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-400 shadow-amber-500/5"
            }`}>
              <span className={`flex h-2 w-2 rounded-full ${
                plan === "pro" ? "bg-emerald-400" : plan === "enterprise" ? "bg-violet-400" : "bg-amber-400"
              }`} />
              {plan === "pro" ? "Pro" : plan === "enterprise" ? "Enterprise" : "Free"}
              <Link href="/services/pricing" className="underline-offset-2 hover:underline opacity-70 hover:opacity-100 transition-opacity">
                {plan === "starter" ? "Upgrade" : "Manage"}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${plan === "starter" ? "bg-amber-500" : plan === "enterprise" ? "bg-violet-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min((used / Math.max(limit, 1)) * 100, 100)}%` }}
                />
              </div>
              <span className="tabular-nums">{used}/{limit === 999999 ? "∞" : limit}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <div className="h-3 w-px bg-white/[0.06]" />
              <Share2 className="h-3 w-3 text-slate-500" />
              <span className="tabular-nums">{activeShares} active</span>
            </div>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-400 active:scale-95"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload Study
          </Link>
        </div>
      </div>

      {StatsCards && <StatsCards />}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {StudyStatusSection && <div className="lg:col-span-2"><StudyStatusSection /></div>}

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Quick Actions
          </h2>
          <div className="mt-4 space-y-2">
            <Link
              href="/upload"
              className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm transition-all hover:border-emerald-500/20 hover:bg-gradient-to-r hover:from-emerald-500/[0.04] hover:to-transparent active:scale-[0.99]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 text-emerald-400 shadow-sm shadow-emerald-500/5 transition-transform group-hover:scale-105">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Upload Study</div>
                <div className="text-xs text-slate-500">DICOMDIR or individual files</div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard/team"
              className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm transition-all hover:border-sky-500/20 hover:bg-gradient-to-r hover:from-sky-500/[0.04] hover:to-transparent active:scale-[0.99]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400/20 to-sky-500/5 text-sky-400 shadow-sm shadow-sky-500/5 transition-transform group-hover:scale-105">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Manage Team</div>
                <div className="text-xs text-slate-500">Invite members, set roles</div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/studies"
              className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm transition-all hover:border-violet-500/20 hover:bg-gradient-to-r hover:from-violet-500/[0.04] hover:to-transparent active:scale-[0.99]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400/20 to-violet-500/5 text-violet-400 shadow-sm shadow-violet-500/5 transition-transform group-hover:scale-105">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Shared Links</div>
                <div className="text-xs text-slate-500">{activeShares} active share link{activeShares !== 1 ? "s" : ""}</div>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-slate-700 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {recentShares.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Recent Shares
            </h2>
            <Link href="/studies" className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.06]">
            <div className="max-h-48 overflow-auto">
              <table className="w-full">
                <tbody className="divide-y divide-white/[0.03]">
                  {recentShares.map((share) => (
                    <tr key={share.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link href={`/studies/${share.study.id}`} className="text-sm font-medium text-slate-200 transition-colors hover:text-blue-400">
                          {share.study.patientName || "Unknown"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-slate-600">
                          /share/{share.token.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[10px] ${new Date(share.expiresAt) > new Date() ? "text-emerald-400" : "text-red-400"}`}>
                          {new Date(share.expiresAt) > new Date() ? "Active" : "Expired"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            All Studies
          </h2>
          {recentStudies.length > 0 && (
            <span className="text-xs text-slate-600 tabular-nums">{totalStudies} total</span>
          )}
        </div>

        {recentStudies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-6 py-24 text-center transition-all hover:border-white/[0.1]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/[0.06] text-emerald-400/50">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">No studies yet</h3>
            <p className="mt-1.5 max-w-xs text-sm text-slate-500 leading-relaxed">
              Upload your first DICOM study to get started.
              Drag &amp; drop a DICOMDIR or individual files.
            </p>
            <a
              href="/upload"
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-400 active:scale-95"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload DICOM
            </a>
          </div>
        ) : (
          <RecentStudiesTable />
        )}
      </section>

    </main>
  );
}

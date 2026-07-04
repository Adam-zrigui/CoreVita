import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShareViewer } from "./ShareViewer";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ password?: string }>;
}) {
  const { token } = await params;
  const { password } = await searchParams;

  const share = await prisma.shareToken.findUnique({
    where: { token },
    include: {
      study: {
        select: {
          studyUid: true,
          patientName: true,
          title: true,
          patientId: true,
          modality: true,
          studyDate: true,
          description: true,
          slices: true,
          series: {
            orderBy: [{ seriesNumber: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
            select: {
              id: true,
              seriesUid: true,
              modality: true,
              instanceCount: true,
              seriesNumber: true,
            },
          },
        },
      },
    },
  });

  if (!share) redirect("/share/expired");

  if (share.expiresAt < new Date()) {
    return <ExpiredPage />;
  }

  if (share.password && !password) {
    return <PasswordGate />;
  }

  if (share.password && password) {
    const Crypto = await import("crypto");
    const hash = Crypto.createHash("sha256").update(password).digest("hex");
    if (hash !== share.password) {
      return <PasswordGate error="Incorrect password" />;
    }
  }

  return (
    <ShareViewer
      token={token}
      study={share.study}
      allowDownload={share.allowDownload}
      expiresAt={share.expiresAt}
    />
  );
}

function ExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">Link Expired</h1>
          <p className="mt-2 text-sm text-slate-500">
            This share link is no longer available.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            The study owner may need to generate a new link.
          </p>
          <hr className="my-6 border-white/[0.06]" />
          <h2 className="text-sm font-medium text-white">Share your own scans with CoreVita Scan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload, view, and share medical images securely with anyone.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98]"
          >
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}

function PasswordGate({ error }: { error?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-8 text-center backdrop-blur-2xl shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-sky-500/10 text-emerald-400 ring-1 ring-white/[0.06]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">Password Required</h1>
          <p className="mt-1 text-sm text-slate-500">
            This study is password protected. Enter the password to view.
          </p>
          <form method="GET" className="mt-6 space-y-4">
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              required
              autoFocus
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500/50"
            />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98]"
            >
              View Study
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

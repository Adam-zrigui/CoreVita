"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ArrowRight, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [tenant, setTenant] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { slug: s } = await params;
      if (!mounted) return;
      setSlug(s);
      const res = await fetch(`/api/team/join?slug=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json();
        if (mounted) setTenant(data);
      } else {
        if (mounted) setLoading(false);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [params]);

  const handleJoin = async () => {
    if (!slug) return;
    setJoining(true);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) {
        toast.success(`Joined ${tenant?.name ?? "organization"}`);
        router.push("/dashboard");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to join");
        if (res.status === 401) router.push("/login");
      }
    } catch {
      toast.error("Network error");
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0F]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <Building2 className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-white">Invitation not found</h1>
        <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
          This invite link is invalid or the organization no longer exists.
        </p>
        <Link
          href="/login"
          className="mt-6 flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1]"
        >
          Go to login
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0F] px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Building2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="mt-5 text-lg font-semibold text-white">
            Join <span className="text-emerald-400">{tenant.name}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;ve been invited to join this organization on CoreVita.
          </p>
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40"
          >
            {joining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {joining ? "Joining..." : "Accept invitation"}
          </button>
          <Link
            href="/login"
            className="mt-3 text-xs text-slate-600 underline underline-offset-2 hover:text-slate-400"
          >
            Not you? Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}

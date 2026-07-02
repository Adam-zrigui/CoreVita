"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "@/lib/firebase/auth";

export function PublicHeader() {
  const [user, setUser] = useState<{ uid: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 z-40 border-b border-white/[0.06] bg-oklch(0.08 0.005 260 / 0.8) backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition active:scale-95"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 shadow-lg shadow-emerald-500/10">
            <img src="/favicon.png" alt="" className="h-6 w-6" />
          </div>
          <span className="text-sm font-semibold text-white">CoreVita</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/services/pricing"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            Pricing
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/register"
              className="rounded-lg bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              Get started
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

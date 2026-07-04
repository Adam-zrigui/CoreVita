"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";

export function UserMenu({ name }: { name?: string | null }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2.5">
      <div className="hidden text-right lg:block">
        <div className="text-xs font-medium text-slate-200 leading-tight">
          {name ?? "User"}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold transition-colors hover:bg-emerald-500/20"
      >
        {(name ?? "U")[0].toUpperCase()}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl border border-white/[0.06] bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl">
          <Link
            href="/dashboard/team"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <Users className="h-3.5 w-3.5" />
            Team
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <hr className="my-1 border-white/[0.06]" />
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                const { signOut } = await import("@/lib/firebase/auth");
                await signOut();
              } catch (e) {
                console.error("[auth] sign out failed:", e);
                setSigningOut(false);
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

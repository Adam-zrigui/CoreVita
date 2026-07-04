"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationDropdown } from "@/components/NotificationDropdown";

const sharedLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studies", label: "Studies" },
  { href: "/patients", label: "Patients" },
  { href: "/upload", label: "Upload" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function AppNav({ name, hasAuditLog }: { name?: string | null; hasAuditLog?: boolean }) {
  const pathname = usePathname();
  const links = [
    ...sharedLinks,
    ...(hasAuditLog ? [{ href: "/dashboard/audit", label: "Audit" }] : []),
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-40 border-b border-white/[0.06] bg-oklch(0.08 0.005 260 / 0.8) backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition active:scale-95"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 shadow-lg shadow-emerald-500/10">
              <img src="/favicon.png" alt="" className="h-6 w-6" />
            </div>
            <span className="hidden text-sm font-semibold text-white sm:inline">
              CoreVita
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-emerald-400"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-400/60 to-emerald-400/10" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationDropdown />
          <UserMenu name={name} />
        </div>
      </div>
    </header>
  );
}

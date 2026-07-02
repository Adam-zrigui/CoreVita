import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { AppNav } from "@/components/AppNav";
import { CommandPaletteProvider } from "@/components/CommandPalette";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  const planInfo = await getCurrentPlan(session);
  const hasAuditLog = planHasFeature(planInfo.plan, "audit_log");

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav name={session.user.name} role={session.user.role} hasAuditLog={hasAuditLog} />
      <CommandPaletteProvider />
      <div className="flex-1 pt-14">{children}</div>
      <footer className="border-t border-white/[0.04] py-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6">
          <p className="text-[11px] text-slate-700">
            &copy; {new Date().getFullYear()} CoreVita. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-700">
            <a href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</a>
            <a href="/imprint" className="hover:text-slate-500 transition-colors">Imprint</a>
            <a href="/terms" className="hover:text-slate-500 transition-colors">Terms</a>
            <span className="text-white/[0.04]">|</span>
            <span className="text-slate-600 text-[10px]">Prototype &mdash; CoreVita Medical OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

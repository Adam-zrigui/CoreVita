import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-sky-500/5 ring-1 ring-white/[0.04]">
          <img src="/favicon.png" alt="CoreVita" className="h-6 w-6" />
        </div>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-slate-600">
          CoreVita is a prototype for a future medical operating system &mdash; purpose-built for secure medical image management, compliant with GDPR and German healthcare regulations (Patientendaten-Schutz-Gesetz).
        </p>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-700">
          <Link href="/imprint" className="transition-colors hover:text-slate-400">Imprint</Link>
          <span className="text-white/[0.04]">·</span>
          <Link href="/privacy" className="transition-colors hover:text-slate-400">Privacy</Link>
          <span className="text-white/[0.04]">·</span>
          <Link href="/terms" className="transition-colors hover:text-slate-400">Terms</Link>
          <span className="text-white/[0.04]">·</span>
          <span className="text-[10px] text-slate-600">Prototype</span>
          <span className="text-white/[0.04]">·</span>
          <span className="text-slate-600">&copy; 2024–{String(new Date().getFullYear()).padStart(4, "0")} CoreVita Medical OS</span>
        </div>
      </div>
    </footer>
  );
}

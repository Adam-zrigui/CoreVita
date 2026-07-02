import { PublicHeader } from "@/components/PublicHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import Link from "next/link";
import { ArrowRight, Upload, Eye, Share2, Shield, Check, Sparkles } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Upload",
    desc: "Drag-and-drop DICOM files. Auto-parses metadata and organizes by study — no PACS required.",
    gradient: "from-emerald-400/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderHover: "hover:border-emerald-500/20",
  },
  {
    icon: Eye,
    title: "View",
    desc: "Zero-footprint web viewer with window/level, zoom, pan, stack scroll, and measurement tools.",
    gradient: "from-sky-400/20 to-sky-500/5",
    iconColor: "text-sky-400",
    borderHover: "hover:border-sky-500/20",
  },
  {
    icon: Share2,
    title: "Share",
    desc: "Generate secure links with expiry dates, optional password protection, and download control.",
    gradient: "from-violet-400/20 to-violet-500/5",
    iconColor: "text-violet-400",
    borderHover: "hover:border-violet-500/20",
  },
];

const steps = [
  {
    number: "01", title: "Upload your scans",
    desc: "Drag DICOM files into the browser. Metadata is parsed and organized automatically.",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    number: "02", title: "Review in the viewer",
    desc: "Use the full-featured web viewer to inspect images, adjust windows, scroll slices, and take measurements.",
    gradient: "from-sky-500/20 to-sky-600/10",
    color: "text-sky-400",
    border: "border-sky-500/20",
  },
  {
    number: "03", title: "Share via secure link",
    desc: "Generate a time-limited link with optional password. Share it with anyone — even if they don't have an account.",
    gradient: "from-violet-500/20 to-violet-600/10",
    color: "text-violet-400",
    border: "border-violet-500/20",
  },
];

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "/mo",
    desc: "For individual clinicians",
    features: ["Up to 3 studies", "7-day link expiry", "Powered by CoreVita", "Basic viewer tools"],
    cta: "Start for free",
    href: "/register",
    popular: false,
    accent: "slate",
  },
  {
    name: "Pro",
    price: "€49",
    period: "/mo",
    desc: "For practices and small clinics",
    features: ["Unlimited studies", "Custom link expiry (up to 365d)", "No watermark", "Password protection", "Download toggle", "Advanced viewer tools", "Measurement & annotation", "Audit log tracking"],
    cta: "Start free trial",
    href: "/services/pricing",
    popular: true,
    accent: "emerald",
  },
  {
    name: "Clinic",
    price: "€149",
    period: "/mo",
    desc: "For hospitals and large clinics",
    features: ["Everything in Pro", "Unlimited team members", "SSO authentication", "Priority support", "Custom branding", "API access", "SLA guarantee"],
    cta: "Contact sales",
    href: "mailto:sales@corevita.com",
    popular: false,
    accent: "violet",
  },
];

const ACCENT_MAP: Record<string, { border: string; bg: string; text: string; btn: string; badge: string; shadow: string }> = {
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/[0.04]",
    text: "text-emerald-400",
    btn: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500",
    badge: "bg-emerald-500",
    shadow: "shadow-emerald-500/5",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/[0.04]",
    text: "text-violet-400",
    btn: "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500",
    badge: "bg-violet-500",
    shadow: "shadow-violet-500/5",
  },
  slate: {
    border: "border-white/[0.06]",
    bg: "bg-white/[0.02]",
    text: "text-slate-300",
    btn: "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
    badge: "bg-slate-500",
    shadow: "",
  },
};

export const dynamic = "force-static";

export default function MarketingPage() {
  return (
    <main className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[160px]" />
          <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-sky-500/5 blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-sky-500/10 ring-1 ring-white/[0.06] shadow-lg shadow-emerald-500/10">
            <img src="/favicon.png" alt="CoreVita" className="h-8 w-8" />
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl leading-tight">
            Share medical scans<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-sky-400">
              instantly. Just a link.
            </span>
          </h1>

          <p className="mt-5 text-base text-slate-400 leading-relaxed sm:text-lg max-w-2xl mx-auto">
            Upload DICOM studies, review them in the browser, and share secure links
            with colleagues and patients — no PACS or VPN required.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-400/25 active:scale-95"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.06] hover:text-white active:scale-95"
            >
              View Pricing
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              GDPR compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Encrypted
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            How it works
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Three simple steps to share medical images securely.
          </p>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className="group relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute top-6 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-emerald-500/30 via-sky-500/30 to-transparent sm:block" />
              )}
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} ${step.color} text-sm font-semibold ring-1 ring-white/[0.06] shadow-sm transition-transform group-hover:scale-105`}>
                {step.number}
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Everything you need
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Upload, view, and share DICOM studies from any device.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all ${f.borderHover} hover:bg-white/[0.04] hover:shadow-[0_0_30px_-12px] hover:shadow-emerald-500/10`}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} ${f.iconColor} ring-1 ring-white/[0.04] transition-all group-hover:scale-105 group-hover:shadow-sm`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-5 text-base font-semibold text-white">{f.title}</div>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Start free. Upgrade when you need more.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const accent = ACCENT_MAP[plan.accent];
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all hover:shadow-lg ${
                  plan.popular
                    ? `${accent.border} ${accent.bg} ${accent.shadow}`
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                }`}
              >
                <div className={`pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${plan.accent === "emerald" ? "from-emerald-400/60 via-emerald-400/20 to-transparent" : plan.accent === "violet" ? "from-violet-400/60 via-violet-400/20 to-transparent" : "from-white/[0.06] to-transparent"}`} />

                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
                    Most Popular
                  </div>
                )}
                <div className={plan.popular ? "mt-2" : ""}>
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{plan.desc}</p>
                </div>
                <ul className="mt-7 flex-1 space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                      <Check className={`h-4 w-4 shrink-0 ${plan.popular ? "text-emerald-400" : "text-slate-600"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] shadow-lg ${accent.btn}`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

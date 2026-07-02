export const dynamic = 'force-static';

import { PublicHeader } from "@/components/PublicHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import Link from "next/link";
import { Check } from "lucide-react";

const ACCENT_MAP = {
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/[0.04]",
    shadow: "shadow-emerald-500/5",
    btn: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500",
  },
  violet: {
    border: "border-violet-500/30",
    bg: "bg-violet-500/[0.04]",
    shadow: "shadow-violet-500/5",
    btn: "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500",
  },
  slate: {
    border: "border-white/[0.06]",
    bg: "bg-white/[0.02]",
    shadow: "",
    btn: "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
  },
};

const tiers = [
  {
    name: "Free",
    price: "€0",
    period: "/mo",
    desc: "For individual clinicians",
    plan: null,
    features: ["Up to 3 studies", "7-day link expiry", "Powered by CoreVita watermark", "Basic viewer tools"],
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
    plan: "pro",
    features: ["Unlimited studies", "Custom link expiry (up to 365d)", "No watermark", "Password protection", "Download toggle", "Advanced viewer tools", "Measurement & annotation", "Audit log tracking"],
    cta: "Start free trial",
    popular: true,
    accent: "emerald",
  },
  {
    name: "Clinic",
    price: "€149",
    period: "/mo",
    desc: "For hospitals and large clinics",
    plan: "enterprise",
    features: ["Everything in Pro", "Unlimited team members", "SSO authentication", "Priority support", "Custom branding", "API access", "SLA guarantee"],
    cta: "Contact sales",
    popular: false,
    accent: "violet",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <PublicHeader />

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => {
            const accent = ACCENT_MAP[tier.accent as keyof typeof ACCENT_MAP];
            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all hover:shadow-lg ${
                  tier.popular
                    ? `${accent.border} ${accent.bg} ${accent.shadow}`
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                }`}
              >
                <div className={`pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${tier.accent === "emerald" ? "from-emerald-400/60 via-emerald-400/20 to-transparent" : tier.accent === "violet" ? "from-violet-400/60 via-violet-400/20 to-transparent" : "from-white/[0.06] to-transparent"}`} />

                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20">
                    Most Popular
                  </div>
                )}
                <div className={tier.popular ? "mt-2" : ""}>
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-white">{tier.price}</span>
                    <span className="text-sm text-slate-500">{tier.period}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{tier.desc}</p>
                </div>

                <ul className="mt-7 flex-1 space-y-3.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                      <Check className={`h-4 w-4 shrink-0 ${tier.popular ? "text-emerald-400" : "text-slate-600"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.plan ? (
                  <CheckoutButton plan={tier.plan} popular={tier.popular} className={accent.btn} planName={tier.name}>
                    {tier.cta}
                  </CheckoutButton>
                ) : (
                  <Link
                    href={tier.href!}
                    className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] ${accent.btn}`}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-slate-600 transition-colors hover:text-slate-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

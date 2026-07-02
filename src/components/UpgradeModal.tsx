"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Check, Crown } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "€0",
    period: "/mo",
    features: ["Up to 3 studies/week", "7-day link expiry", "Basic viewer tools", "1 user"],
  },
  {
    name: "Pro",
    price: "€49",
    period: "/mo",
    features: [
      "Unlimited studies",
      "Custom link expiry (up to 365d)",
      "No watermark",
      "Advanced viewer tools",
      "Measurement & annotation",
      "Audit log tracking",
      "Up to 5 users",
    ],
    popular: true,
  },
  {
    name: "Clinic",
    price: "€149",
    period: "/mo",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "SSO authentication",
      "Priority support",
      "Custom branding",
      "API access",
      "SLA guarantee",
    ],
  },
];

export function UpgradeModal({
  open,
  onClose,
  currentPlan = "starter",
}: {
  open: boolean;
  onClose: () => void;
  currentPlan?: "starter" | "pro" | "enterprise";
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const currentName =
    currentPlan === "enterprise" ? "Clinic" : currentPlan === "pro" ? "Pro" : "Free";

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade your plan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-amber-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-white">Upgrade your plan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent =
              (tier.name === "Free" && currentPlan === "starter") ||
              (tier.name === "Pro" && currentPlan === "pro") ||
              (tier.name === "Clinic" && currentPlan === "enterprise");

            return (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border p-5 ${
                  tier.popular
                    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                    : isCurrent
                      ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                      : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white shadow-lg whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className={tier.popular ? "mt-2" : ""}>
                  <h3 className="text-sm font-semibold text-white">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white tracking-tight">{tier.price}</span>
                    {tier.period && (
                      <span className="text-[10px] text-slate-500">{tier.period}</span>
                    )}
                  </div>
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Check className={`h-3 w-3 shrink-0 ${tier.popular ? "text-emerald-400" : "text-slate-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="mt-5 w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-[10px] font-semibold text-emerald-400">
                    Current plan
                  </div>
                ) : tier.name === "Free" ? null : (
                  <Link
                    href="/services/pricing"
                    onClick={onClose}
                    className={`mt-5 block w-full rounded-lg px-4 py-2 text-center text-xs font-semibold text-white shadow-lg transition-all active:scale-[0.98] ${
                      tier.popular
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500"
                        : "bg-white/[0.08] hover:bg-white/[0.12]"
                    }`}
                  >
                    Upgrade to {tier.name}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/[0.06] px-6 py-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] text-slate-600 transition-colors hover:text-slate-400"
          >
            Continue with {currentName}
          </button>
        </div>
      </div>
    </div>
  );
}

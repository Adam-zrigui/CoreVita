"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CheckoutButtonProps = {
  plan: string | null;
  popular?: boolean;
  className?: string;
  children: React.ReactNode;
  planName?: string; // used to show "Switch to {planName}" when already subscribed
};

export function CheckoutButton({ plan, popular, className, children, planName }: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [checked, setChecked] = useState(false);
  const isThisLoading = loading === plan;

  useEffect(() => {
    let mounted = true;
    fetch("/api/billing/usage")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!mounted) return;
        if (data?.status === "active" || data?.status === "trialing") {
          setHasSubscription(true);
        }
      })
      .catch((e) => { if (mounted) console.error("[checkout] redirect failed:", e); })
      .finally(() => { if (mounted) setChecked(true); });
    return () => { mounted = false; };
  }, []);

  const handleCheckout = async () => {
    if (!plan) return;
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) { router.push("/login"); return; }
        throw new Error(data.error ?? "Checkout failed");
      }
      const data = await res.json();

      if (data.switched) {
        toast.success(`Switched to ${planName || "new plan"}!`);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Unexpected response");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    }
    setLoading(null);
  };

  const label = checked && hasSubscription && planName
    ? `Switch to ${planName}`
    : children;

  if (!plan) {
    return (
      <a
        href="mailto:sales@corevita.com?subject=Enterprise%20plan%20inquiry"
        className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] ${className || (
          popular
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500"
            : "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
        )}`}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={isThisLoading}
      onClick={handleCheckout}
      className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 ${className || (
        popular
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500"
          : "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
      )}`}
    >
      {isThisLoading ? "Redirecting..." : label}
    </button>
  );
}
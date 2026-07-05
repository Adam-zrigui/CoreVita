"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CreditCard, Building2, BarChart3, ExternalLink, Settings2,
  CheckCircle2, User, Bell, Key, AlertTriangle, Copy, Check,
  Globe, Mail, Shield, Smartphone, Trash2, Plus, Eye, EyeOff,
  Palette, Image,
} from "lucide-react";

type Usage = {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
  status: string;
};
type Tenant = { id: string; name: string; slug: string };

export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyLoaded, setNotifyLoaded] = useState(false);
  const [savingNotify, setSavingNotify] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    fetch("/api/settings/notifications").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.email === "boolean") setNotifyEmail(data.email);
      if (typeof data.browser === "boolean") setNotifyBrowser(data.browser);
      setNotifyLoaded(true);
    }).catch(() => { setNotifyLoaded(true); });
  }, []);

  const saveNotification = async (email: boolean, browser: boolean) => {
    setSavingNotify(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, browser }),
      });
    } catch { /* ignore */ }
    setSavingNotify(false);
  };

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    const load = async () => {
      try {
        const [usageRes, teamRes] = await Promise.all([
          fetch("/api/billing/usage", { signal: ac.signal }),
          fetch("/api/team", { signal: ac.signal }),
        ]);
        if (!mounted) return;
        if (usageRes.ok) { const u = await usageRes.json(); if (mounted) setUsage(u); }
        if (teamRes.ok) { const d = await teamRes.json(); if (mounted) setTenant(d.tenant ?? null); }
      } catch { /* aborted or network error */ }
      if (mounted) setLoadingUsage(false);
    };
    load();
    return () => { mounted = false; ac.abort(); };
  }, []);

  const handleBillingPortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? "No active subscription");
    } catch { toast.error("Failed to open billing portal"); }
    setLoadingPortal(false);
  };

  const handleSwitch = async (plan: string, planName: string) => {
    setSwitchingPlan(plan);
    try {
      if (plan === "starter") {
        const res = await fetch("/api/billing/portal", { method: "POST" });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return; }
        throw new Error(data.error ?? "No active subscription");
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, returnUrl: "/dashboard/settings" }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) { setSwitchingPlan(null); return; }
        throw new Error(data.error ?? "Switch failed");
      }
      const data = await res.json();
      if (data.switched) {
        toast.success(`Switched to ${planName}!`);
        setUsage((prev) => prev ? { ...prev, plan } : prev);
        setSwitchingPlan(null);
        return;
      }
      if (data.url) { window.location.href = data.url; return; }
      throw new Error("Unexpected response");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Switch failed");
    }
    setSwitchingPlan(null);
  };

  const usagePercent = usage && usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0;
  const isActive = usage?.status === "active" || usage?.status === "trialing";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <Settings2 className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-semibold tracking-tight text-white">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Manage your account, organization, and billing</p>
      </div>

      <div className="space-y-6">
        {/* Organization */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 shadow-sm ring-1 ring-white/[0.04]">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-white">{tenant?.name ?? "Organization"}</div>
              <div className="text-sm text-slate-500">{tenant?.slug ? `${tenant.slug}.corevita.app` : "No slug configured"}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400/60 via-violet-400/20 to-transparent" />
          {loadingUsage ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-white/[0.06]" />
                <div className="h-3 w-16 rounded bg-white/[0.04]" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-white/[0.06]" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 text-violet-400 shadow-sm ring-1 ring-white/[0.04]">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-white capitalize">{usage?.plan ?? "Free"} Plan</div>
                  {isActive && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className="text-sm text-slate-500 capitalize">{usage?.status ?? "No subscription"}</div>
              </div>
              <button
                type="button"
                onClick={handleBillingPortal}
                disabled={loadingPortal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] active:scale-95 disabled:opacity-40"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {loadingPortal ? "Loading..." : "Manage"}
              </button>
            </div>
          )}
        </div>

        {/* Change Plan */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 shadow-sm ring-1 ring-white/[0.04]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Change Plan</div>
              <div className="text-xs text-slate-500">Switch between plans to fit your needs</div>
            </div>
          </div>

          {loadingUsage ? (
            <div className="grid gap-4 md:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.06] mb-3" />
                  <div className="h-5 w-16 rounded bg-white/[0.06] mb-2" />
                  <div className="h-7 w-20 rounded bg-white/[0.06] mb-1" />
                  <div className="h-3 w-32 rounded bg-white/[0.04] mb-4" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-3 w-full rounded bg-white/[0.04]" />
                    ))}
                  </div>
                  <div className="mt-4 h-10 w-full rounded-lg bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { key: "starter", name: "Free", price: "€0", desc: "For individual clinicians", features: ["Up to 3 studies", "7-day link expiry", "Watermark", "Basic viewer tools"], accent: "slate", gradient: "from-slate-500/20 to-slate-500/5", text: "text-slate-400", btnColor: "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" },
                { key: "pro", name: "Pro", price: "€49", desc: "For practices and small clinics", features: ["Unlimited studies", "Custom link expiry", "No watermark", "Password protection", "Advanced viewer", "Audit log"], accent: "emerald", gradient: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-400", btnColor: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500" },
                { key: "enterprise", name: "Clinic", price: "€149", desc: "For hospitals and large clinics", features: ["Everything in Pro", "Unlimited team", "SSO", "Priority support", "Custom branding", "API access"], accent: "violet", gradient: "from-violet-500/20 to-violet-500/5", text: "text-violet-400", btnColor: "bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500" },
              ].map((tier) => {
                const isCurrent = usage?.plan === tier.key;
                return (
                  <div
                    key={tier.key}
                    className={`relative rounded-xl border p-4 transition-all ${
                      isCurrent
                        ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.09]"
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-3 right-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        Current
                      </span>
                    )}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ring-1 ring-white/[0.04] mb-3 ${tier.gradient} ${tier.text}`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className={`text-lg font-semibold text-white`}>{tier.name}</div>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-white">{tier.price}</span>
                      {tier.price !== "€0" && <span className="text-xs text-slate-500 ml-1">/mo</span>}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">{tier.desc}</p>
                    <ul className="mt-4 space-y-1.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500/60" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <div className="mt-4 w-full rounded-lg bg-white/[0.04] px-4 py-2.5 text-center text-xs font-medium text-slate-500">
                        Active plan
                      </div>
                    ) : tier.key === "starter" && isActive ? (
                      <button
                        type="button"
                        disabled={switchingPlan === tier.key}
                        onClick={() => handleSwitch(tier.key, tier.name)}
                        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-400 shadow-lg transition-all hover:bg-red-500/[0.06] active:scale-[0.98] disabled:opacity-40"
                      >
                        {switchingPlan === tier.key ? "Redirecting..." : "Cancel subscription"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={switchingPlan === tier.key}
                        onClick={() => handleSwitch(tier.key, tier.name)}
                        className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 ${tier.btnColor}`}
                      >
                        {switchingPlan === tier.key ? "Switching..." : `Switch to ${tier.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Study Usage */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400/60 via-amber-400/20 to-transparent" />
          {loadingUsage ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-white/[0.06]" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-white/[0.06]" />
                  <div className="h-4 w-16 rounded bg-white/[0.06]" />
                </div>
                <div className="h-2 w-full rounded-full bg-white/[0.06]" />
                <div className="h-3 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-400 shadow-sm ring-1 ring-white/[0.04]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white">Study Usage</div>
                  <div className="text-sm text-slate-500 tabular-nums">
                    {usage?.used ?? 0} <span className="text-slate-600">/ {usage?.limit ?? 500}</span>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-slate-600 tabular-nums">
                  {usage?.remaining ?? 0} remaining
                  {usage && usagePercent > 80 && (
                    <span className="ml-2 text-amber-400">
                      {usagePercent > 90 ? "Critical — upgrade your plan" : "Running low"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400/60 via-sky-400/20 to-transparent" />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 text-sky-400 shadow-sm ring-1 ring-white/[0.04]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Notifications</div>
              <div className="text-xs text-slate-500">Choose how you receive updates</div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05]">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-600" />
                <div>
                  <div className="text-sm text-slate-200">Email notifications</div>
                  <div className="text-xs text-slate-600">Report completions and team updates</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savingNotify && <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />}
                <div
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={notifyEmail}
                  onClick={() => { const v = !notifyEmail; setNotifyEmail(v); saveNotification(v, notifyBrowser); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = !notifyEmail; setNotifyEmail(v); saveNotification(v, notifyBrowser); } }}
                  className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${
                    notifyEmail ? "bg-emerald-500" : "bg-white/[0.1]"
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    notifyEmail ? "translate-x-4" : "translate-x-0"
                  }`} />
                </div>
              </div>
            </label>
            <label className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05]">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-slate-600" />
                <div>
                  <div className="text-sm text-slate-200">Browser notifications</div>
                  <div className="text-xs text-slate-600">Study status changes and alerts</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savingNotify && <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />}
                <div
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={notifyBrowser}
                  onClick={() => { const v = !notifyBrowser; setNotifyBrowser(v); saveNotification(notifyEmail, v); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = !notifyBrowser; setNotifyBrowser(v); saveNotification(notifyEmail, v); } }}
                  className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${
                    notifyBrowser ? "bg-emerald-500" : "bg-white/[0.1]"
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    notifyBrowser ? "translate-x-4" : "translate-x-0"
                  }`} />
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* API Access */}
        <ApiKeysSection usage={usage} origin={origin} />

        {/* Custom Branding */}
        <BrandingSection usage={usage} />

        {/* Danger Zone */}
        <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.02] p-5 transition-all hover:border-red-500/30">
          <button
            type="button"
            onClick={() => setShowDanger(!showDanger)}
            className="flex w-full items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 shadow-sm ring-1 ring-red-500/10">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-red-300">Danger Zone</div>
              <div className="text-xs text-red-400/60">Irreversible actions</div>
            </div>
            <span className="text-xs text-slate-600">{showDanger ? "Hide" : "Manage"}</span>
          </button>
          {showDanger && (
            <div className="mt-4 space-y-3 border-t border-red-500/10 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm text-slate-200">Delete account</div>
                  <div className="text-xs text-slate-600">Permanently remove your account and all associated data</div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.error("Contact support to delete your account")}
                  className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-500 active:scale-95"
                >
                  Delete
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
                <div>
                  <div className="text-sm text-slate-200">Export all data</div>
                  <div className="text-xs text-slate-600">Download all studies and reports as ZIP</div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.success("Export request submitted")}
                  className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] active:scale-95"
                >
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection({ usage, origin }: { usage: Usage | null; origin: string }) {
  const [keys, setKeys] = useState<Array<{ id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [copied, setCopied] = useState(false);
  const hasAccess = usage?.plan === "enterprise";

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        setKeyName("");
        loadKeys();
      } else {
        toast.error(data.error ?? "Failed to create key");
      }
    } catch { toast.error("Failed to create key"); }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Key revoked");
        loadKeys();
      } else {
        toast.error("Failed to revoke key");
      }
    } catch { toast.error("Failed to revoke key"); }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/60 via-cyan-400/20 to-transparent" />
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 shadow-sm ring-1 ring-white/[0.04]">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">API Access</div>
          <div className="text-xs text-slate-500">Integrate CoreVita with external tools</div>
        </div>
        {!hasAccess && (
          <span className="ml-auto rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-600">
            Clinic only
          </span>
        )}
      </div>

      <div className="rounded-lg bg-white/[0.03] px-4 py-3 border border-white/[0.04] mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5" />
            <span>API endpoint</span>
          </div>
          <code className="rounded bg-white/[0.04] px-2.5 py-1 text-[11px] font-mono text-slate-400">
            {origin || "https://corevita.vercel.app"}/api
          </code>
        </div>
      </div>

      {hasAccess && (
        <>
          {newKey && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
              <p className="text-xs font-medium text-emerald-400 mb-2">Key created — copy it now, you won&apos;t see it again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-white/[0.04] px-3 py-2 text-[11px] font-mono text-slate-200">
                  {newKey}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 rounded-lg bg-white/[0.06] p-2 text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-slate-200"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNewKey(null)}
                className="mt-2 text-[10px] text-slate-600 transition-colors hover:text-slate-400"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (e.g. CI/CD)"
              className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-500/50"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              type="button"
              disabled={creating || !keyName.trim()}
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/80 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-cyan-500 active:scale-95 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Generate
            </button>
          </div>

          {loading ? (
            <div className="py-4 text-center text-xs text-slate-600">Loading keys...</div>
          ) : keys.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-600">No API keys created yet</div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{k.name}</span>
                      <code className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                        {k.prefix}...
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(k.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Revoke key"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BrandingSection({ usage }: { usage: Usage | null }) {
  const [branding, setBranding] = useState<{ logoUrl?: string | null; primaryColor?: string | null; accentColor?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#059669");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const hasAccess = usage?.plan === "enterprise";

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings/branding");
        if (res.ok) {
          const data = await res.json();
          if (data.branding) {
            setBranding(data.branding);
            setLogoUrl(data.branding.logoUrl ?? "");
            setPrimaryColor(data.branding.primaryColor ?? "#059669");
            setAccentColor(data.branding.accentColor ?? "#6366f1");
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: logoUrl || null, primaryColor, accentColor }),
      });
      if (res.ok) {
        toast.success("Branding saved");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save branding");
      }
    } catch { toast.error("Failed to save branding"); }
    setSaving(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.09]">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-400/60 via-violet-400/20 to-transparent" />
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 text-violet-400 shadow-sm ring-1 ring-white/[0.04]">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Custom Branding</div>
          <div className="text-xs text-slate-500">Personalize CoreVita for your organization</div>
        </div>
        {!hasAccess && (
          <span className="ml-auto rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-600">
            Clinic only
          </span>
        )}
      </div>

      {hasAccess ? (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <Image className="h-3.5 w-3.5" />
              Logo URL
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://your-org.com/logo.png"
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-white/[0.06] bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[11px] font-mono text-white outline-none transition-colors focus:border-violet-500/50"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColor }} />
                Accent color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-white/[0.06] bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[11px] font-mono text-white outline-none transition-colors focus:border-violet-500/50"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:from-violet-400 hover:to-violet-500 active:scale-95 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save branding"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white/[0.03] px-4 py-4 text-center">
          <p className="text-xs text-slate-500">Upgrade to the Clinic plan to customize branding.</p>
        </div>
      )}
    </div>
  );
}

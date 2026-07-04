"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  UserPlus, Mail, Building2,
  Check, X, Copy, Settings2,
  ArrowUpRight, Hourglass, Trash2,
  Clock,
} from "lucide-react";

type Member = {
  id: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
};

type PendingInvite = {
  id: string;
  email: string;
  createdAt: string;
  invitedBy: { id: string; name: string | null; email: string | null };
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState("starter");
  const [memberLimit, setMemberLimit] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isClinic = plan === "enterprise";
  const isPaid = plan === "pro" || plan === "enterprise";
  const atLimit = members.length >= memberLimit;
  const usagePercent = memberLimit > 0 ? Math.round((members.length / memberLimit) * 100) : 0;

  const inviteLink = tenant?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : "https://corevita.vercel.app"}/join/${tenant.slug}`
    : null;

  const loadData = useCallback(async () => {
    const [teamRes, pendingRes] = await Promise.all([
      fetch("/api/team"),
      fetch("/api/team/pending"),
    ]);
    if (!teamRes.ok) return;
    const data = await teamRes.json();
    setMembers(data.members ?? []);
    setTenant(data.tenant ?? null);
    setPlan(data.plan ?? "starter");
    setMemberLimit(data.memberLimit ?? 1);
    setCurrentUserId(data.currentUserId ?? null);
    if (data.tenant) {
      setOrgName(data.tenant.name ?? "");
      setOrgSlug(data.tenant.slug ?? "");
    }
    if (pendingRes.ok) {
      setPendingInvites(await pendingRes.json());
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    loadData().catch(() => {});
    return () => { mounted = false; ac.abort(); };
  }, [loadData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) {
        setInviteEmail("");
        toast.success("Invited");
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Invite failed");
      }
    } catch { toast.error("Network error"); }
    setBusy(false);
  };

  const handleDeletePending = async (id: string) => {
    try {
      const res = await fetch(`/api/team/pending/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPendingInvites((prev) => prev.filter((p) => p.id !== id));
        toast.success("Invite cancelled");
      } else {
        toast.error("Failed to cancel");
      }
    } catch { toast.error("Network error"); }
  };

  const handleSaveOrg = async () => {
    if (!orgName.trim()) return toast.error("Organization name is required");
    setSavingOrg(true);
    try {
      const res = await fetch("/api/team/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim(), slug: orgSlug.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTenant((prev) => prev ? { ...prev, name: data.name, slug: data.slug } : prev);
        toast.success("Organization updated");
        setShowSettings(false);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to update");
      }
    } catch { toast.error("Network error"); }
    setSavingOrg(false);
  };

  const copyInviteLink = useCallback(() => {
    if (!inviteLink) {
      toast.error("Set an organization slug first");
      return;
    }
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast.success("Invite link copied");
      setCopiedId("invite");
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => toast.error("Failed to copy"));
  }, [inviteLink]);

  const memberProgressColor = atLimit ? "bg-red-500" : usagePercent > 80 ? "bg-amber-500" : "bg-emerald-500";

  const totalSeats = memberLimit === 999999 ? Infinity : memberLimit;
  const seatsLeft = totalSeats === Infinity ? Infinity : totalSeats - members.length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-white">Team</h1>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-500 tabular-nums">
            {members.length} / {totalSeats === Infinity ? "\u221E" : memberLimit}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-400">{tenant?.name ?? "Organization"}</span>
          <span className="mx-1.5 text-slate-700">&middot;</span>
          <span className="text-slate-600">{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</span>
        </p>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06] max-w-[200px]">
            <div
              className={`h-full rounded-full transition-all ${memberProgressColor}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-600 tabular-nums">
            {members.length} of {totalSeats === Infinity ? "\u221E" : memberLimit} seats used
          </span>
        </div>
      </div>

      {atLimit && memberLimit !== 999999 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-3">
          <Hourglass className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="flex-1 text-xs text-slate-300">
            You&apos;ve used all {memberLimit} seats.{" "}
            <Link href="/services/pricing" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">
              Upgrade your plan
            </Link>{" "}
            to add more members.
          </p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 via-emerald-400/20 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Mail className="h-4 w-4" />
          </div>
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="colleague@clinic.com"
            disabled={atLimit && memberLimit !== 999999}
            className="h-9 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleInvite}
            disabled={busy || !inviteEmail.trim() || (atLimit && memberLimit !== 999999)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </button>
        </div>

        {!isPaid && (
          <p className="mt-2 text-[10px] text-amber-400">
            <Link href="/services/pricing" className="underline underline-offset-2 hover:text-amber-300">
              Upgrade to Pro
            </Link>{" "}
            to add up to 5 team members.
          </p>
        )}

        {isPaid && inviteLink && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.03] px-3 py-2">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            <code className="flex-1 truncate font-mono text-[11px] text-slate-500">{inviteLink}</code>
            <button
              type="button"
              onClick={copyInviteLink}
              className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-500 transition-all hover:bg-white/[0.06] hover:text-slate-300 active:scale-95"
            >
              {copiedId === "invite" ? (
                <><Check className="h-3 w-3 text-emerald-400" /> Copied</>
              ) : (
                <><Copy className="h-3 w-3" /> Copy</>
              )}
            </button>
          </div>
        )}

        {isPaid && !inviteLink && (
          <p className="mt-2 text-[10px] text-slate-600">
            Set an organization slug below to generate a shareable invite link.
          </p>
        )}
      </div>

      <div className="mt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Members</h2>

        <div className="space-y-1">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] py-14 text-center">
              <UserPlus className="mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">No team members yet</p>
              <p className="mt-1 text-xs text-slate-600">Invite your colleagues to collaborate on studies</p>
            </div>
          ) : (
            members.map((m) => {
              const isCurrentUser = m.user.id === currentUserId;
              const joinedDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
              return (
                <div
                  key={m.id}
                  className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 transition-all hover:border-white/[0.09] hover:bg-white/[0.04] hover:shadow-[0_0_20px_-8px] hover:shadow-emerald-500/5"
                >
                  <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/[0.03] opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-center gap-3 min-w-0">
                    {m.user.image ? (
                      <img src={m.user.image} alt="" className="h-10 w-10 shrink-0 rounded-full ring-1 ring-white/[0.06]" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 text-xs font-semibold text-emerald-400 shadow-sm ring-1 ring-white/[0.06]">
                        {m.user.name?.[0] ?? m.user.email?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">
                          {m.user.name ?? "Unknown"}
                        </span>
                        {isCurrentUser && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">You</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                        {m.user.email ?? ""}
                        {joinedDate && (
                          <>
                            <span className="text-white/[0.06]">&middot;</span>
                            <span>Joined {joinedDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Invites ({pendingInvites.length})
          </h2>
          <div className="space-y-1">
            {pendingInvites.map((invite) => {
              const sentDate = new Date(invite.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div
                  key={invite.id}
                  className="group flex items-center justify-between rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-300">{invite.email}</div>
                      <div className="text-xs text-slate-600">
                        Invited {sentDate} by {invite.invitedBy.name ?? invite.invitedBy.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePending(invite.id)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-95"
                    title="Cancel invite"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {showSettings ? "Hide" : "Organization settings"}
        </button>

        {showSettings && (
          <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Organization Settings</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Name</label>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-slate-200 focus:border-violet-500/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Slug
                  {!isPaid && <span className="ml-2 text-[10px] text-amber-400 font-normal normal-case">Pro plan feature</span>}
                </label>
                <input
                  value={isPaid ? orgSlug : ""}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  disabled={!isPaid}
                  className="mt-1 h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs font-mono text-slate-200 focus:border-violet-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
                {isPaid && orgSlug && (
                  <p className="mt-1 text-[10px] text-slate-600">
                    Join link: {typeof window !== "undefined" ? window.location.origin : "..."}/join/{orgSlug}
                  </p>
                )}
                {!isPaid && (
                  <p className="mt-1 text-[10px] text-slate-600">
                    <Link href="/services/pricing" className="text-amber-400 underline underline-offset-2 hover:text-amber-300">Upgrade to Pro</Link> to set a custom slug and shareable invite link.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveOrg}
                  disabled={savingOrg}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-violet-400 active:scale-95 disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  {savingOrg ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-1.5 text-xs text-slate-300 transition-all hover:bg-white/[0.1] active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

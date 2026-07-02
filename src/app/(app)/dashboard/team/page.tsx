"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  UserPlus, Trash2, Mail, UserCog, Shield, Settings2, Building2,
  Check, X, Copy, Link, Info, Crown, Eye, Activity, HelpCircle,
  UserCheck, Clock,
} from "lucide-react";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
};

const ROLES = ["ADMIN", "RADIOLOGIST", "ASSISTANT", "VIEWER"] as const;

const ROLE_META: Record<string, { color: string; bg: string; icon: typeof Crown; desc: string }> = {
  ADMIN: { color: "text-amber-400", bg: "bg-amber-500/10", icon: Crown, desc: "Full access — manage team, billing, and all studies" },
  RADIOLOGIST: { color: "text-blue-400", bg: "bg-blue-500/10", icon: Eye, desc: "Read & write studies, create reports" },
  ASSISTANT: { color: "text-violet-400", bg: "bg-violet-500/10", icon: Activity, desc: "Upload studies, manage shares" },
  VIEWER: { color: "text-slate-400", bg: "bg-slate-500/10", icon: Eye, desc: "View studies and reports only" },
};

function planLabel(plan: string) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function ConfirmDialog({
  open, title, message, onConfirm, onCancel, busy,
}: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="mx-4 w-full max-w-sm animate-scale-in rounded-xl border border-white/[0.06] bg-slate-900 p-6 shadow-2xl shadow-red-500/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 mb-4">
          <Trash2 className="h-4 w-4 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg bg-white/[0.06] px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] active:scale-95 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-500 hover:to-red-400 active:scale-95 disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState("starter");
  const [memberLimit, setMemberLimit] = useState(1);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [confirmRemoveId, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRolesHelp, setShowRolesHelp] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isClinic = plan === "enterprise";
  const inviteLink = tenant?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : "https://app.corevita.com"}/join/${tenant.slug}`
    : null;

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/team", { signal: ac.signal });
        if (!mounted) return;
        const data = res.ok ? await res.json() : { members: [], tenant: null };
        if (mounted) {
          setMembers(data.members ?? []);
          setTenant(data.tenant ?? null);
          setPlan(data.plan ?? "starter");
          setMemberLimit(data.memberLimit ?? 1);
          if (data.tenant) {
            setOrgName(data.tenant.name ?? "");
            setOrgSlug(data.tenant.slug ?? "");
          }
        }
      } catch { /* aborted or network error */ }
    })();
    return () => { mounted = false; ac.abort(); };
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [...prev, newMember]);
        setInviteEmail("");
        toast.success("Member invited");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Invite failed");
      }
    } catch { toast.error("Network error"); }
    setBusy(false);
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
        toast.success("Role updated");
      } else {
        toast.error("Failed to update role");
      }
    } catch { toast.error("Network error"); }
  };

  const handleRemove = async () => {
    const memberId = confirmRemoveId;
    if (!memberId) return;
    setConfirmRemove(null);
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        toast.success("Member removed");
      } else {
        toast.error("Failed to remove member");
      }
    } catch { toast.error("Network error"); }
    setRemoving(null);
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-white">Team</h1>
          <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-500 tabular-nums">
            {members.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          <span className="text-slate-400 font-medium">{tenant?.name ?? "Organization"}</span>
          <span className="mx-1.5 text-slate-700">&middot;</span>
          <span className="text-slate-600">{planLabel(plan)} plan</span>
          <span className="mx-1.5 text-slate-700">&middot;</span>
          <span className="text-slate-600">
            {members.length} / {memberLimit === 999999 ? "∞" : memberLimit} members
          </span>
        </p>
      </div>

      {/* Invite section */}
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
            className="h-9 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="h-9 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-slate-300 focus:outline-none"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={handleInvite}
            disabled={busy || !inviteEmail.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition-all hover:bg-emerald-400 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </button>
        </div>

        {/* Copy invite link */}
        {isClinic && inviteLink && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.04] px-3 py-2">
            <Link className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <code className="flex-1 truncate text-[11px] font-mono text-slate-500">{inviteLink}</code>
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
      </div>

      {/* Member list */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Members</h2>
          <button
            type="button"
            onClick={() => setShowRolesHelp(!showRolesHelp)}
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <HelpCircle className="h-3 w-3" />
            {showRolesHelp ? "Hide roles" : "Role permissions"}
          </button>
        </div>

        {/* Roles help */}
        {showRolesHelp && (
          <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((role) => {
                const meta = ROLE_META[role];
                const Icon = meta.icon;
                return (
                  <div key={role} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${meta.color}`}>
                        {role.charAt(0) + role.slice(1).toLowerCase()}
                      </div>
                      <div className="text-[10px] text-slate-600 leading-relaxed">{meta.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] py-14 text-center">
              <UserPlus className="h-8 w-8 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No team members yet</p>
              <p className="text-xs text-slate-600 mt-1">Invite members above to collaborate</p>
            </div>
          ) : (
            members.map((m) => {
              const meta = ROLE_META[m.role];
              const RoleIcon = meta?.icon ?? UserCog;
              return (
                <div
                  key={m.id}
                  className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 transition-all hover:bg-white/[0.04] hover:border-white/[0.09] hover:shadow-[0_0_20px_-8px] hover:shadow-emerald-500/5"
                >
                  <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/[0.03] blur-xl transition-opacity opacity-0 group-hover:opacity-100" />
                  <div className="flex items-center gap-3 min-w-0 relative">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 text-xs font-semibold text-emerald-400 shadow-sm ring-1 ring-white/[0.06]">
                      {m.user.name?.[0] ?? m.user.email?.[0] ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {m.user.name ?? "Unknown"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${meta?.bg ?? "bg-slate-500/10"} ${meta?.color ?? "text-slate-400"}`}>
                          <RoleIcon className="h-2.5 w-2.5" />
                          {m.role === "RADIOLOGIST" ? "Radio." : m.role === "ASSISTANT" ? "Asst." : m.role === "VIEWER" ? "View" : m.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        {m.user.email ?? ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 transition-colors group-hover:border-white/[0.1]">
                      <UserCog className="h-3 w-3 text-slate-600" />
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="bg-transparent text-xs text-slate-300 focus:outline-none"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(m.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Org Settings */}
      {isClinic && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {showSettings ? "Hide" : "Organization settings"}
          </button>

          {showSettings && (
            <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Building2 className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Organization Settings</h3>
                <Shield className="h-3.5 w-3.5 text-violet-400/60 ml-auto" />
                <span className="text-[10px] text-violet-400/60 font-medium">Clinic feature</span>
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
                  <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Slug</label>
                  <input
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="mt-1 h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-slate-200 font-mono focus:border-violet-500/30 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-600">
                    {orgSlug ? `Join link: ${typeof window !== "undefined" ? window.location.origin : "..."}/join/${orgSlug}` : "Set a slug to generate an invite link"}
                  </p>
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
      )}

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove member"
        message="Remove this member from the organization? They will lose access to all studies and shared links."
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemove(null)}
        busy={removing !== null}
      />
    </div>
  );
}

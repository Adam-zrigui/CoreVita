"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Clock, X } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "member.invite": "Member invited",
  "member.remove": "Member removed",
  "member.role_change": "Role changed",
  "study.upload": "Study uploaded",
  "study.delete": "Study deleted",
  "share.create": "Share link created",
  "share.revoke": "Share link revoked",
  "report.create": "Report created",
  "report.ai": "AI report generated",
  "team.settings": "Organization updated",
  login: "User logged in",
};

type Notification = {
  id: string;
  action: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { name: string | null; email: string | null };
};

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (mounted) {
          setNotifications(data.notifications ?? []);
          setUnread(data.unread ?? 0);
        }
      })
      .catch(() => console.error("[notifications] mark-read failed"));
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <span className="text-xs font-semibold text-white">Notifications</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  try { await fetch("/api/notifications/read", { method: "POST" }); } catch {}
                  setUnread(0);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="h-6 w-6 text-slate-700" />
                <p className="mt-2 text-xs text-slate-600">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 border-b border-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-semibold text-emerald-400">
                    {n.actor.name?.[0] ?? n.actor.email?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300">
                      <span className="font-medium text-white">{n.actor.name ?? n.actor.email ?? "Someone"}</span>{" "}
                      {ACTION_LABELS[n.action] ?? n.action}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(n.createdAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

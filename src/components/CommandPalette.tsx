"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, LayoutDashboard, Upload, FolderOpen, Users, ShieldCheck, Settings, FileText, ArrowUpDown } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Studies", href: "/studies", icon: FolderOpen },
  { label: "Upload", href: "/upload", icon: Upload },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "Audit Log", href: "/dashboard/audit", icon: ShieldCheck },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function CommandPaletteProvider({ studies: _studies }: { studies?: { id: string; patientName: string | null; title?: string | null }[] } = {}) {
  const studies = _studies ?? [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => {
          const next = !v;
          if (next) {
            setQuery("");
            setSelectedIndex(0);
          }
          return next;
        });
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const items = [
    ...NAV_ITEMS.map((item) => ({ type: "nav" as const, ...item })),
    ...(studies ?? []).slice(0, 5).map((s) => ({
      type: "study" as const,
      label: s.title ?? s.patientName ?? "Unknown",
      href: `/studies/${s.id}`,
    })),
  ];

  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q);
  });

  const navigate = useCallback((href: string) => {
    if (!href) return;
    setOpen(false);
    try {
      router.push(href);
    } catch {
      window.location.assign(href);
    }
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-4 w-full max-w-lg overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and studies..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <kbd className="rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-600 font-mono">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-600">No results found</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-300 hover:bg-white/[0.04]"
                }`}
              >
                {item.type === "nav" ? (
                  <item.icon className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-500" />
                )}
                <span className="flex-1 text-sm">{item.label}</span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-40" />
              </button>
            ))
          )}
          <div className="mt-2 border-t border-white/[0.04] px-1 pt-2 text-[10px] text-slate-700">
            <span className="mr-3"><kbd className="rounded bg-white/[0.04] px-1 font-mono">↑↓</kbd> Navigate</span>
            <span className="mr-3"><kbd className="rounded bg-white/[0.04] px-1 font-mono">↵</kbd> Open</span>
            <span><kbd className="rounded bg-white/[0.04] px-1 font-mono">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

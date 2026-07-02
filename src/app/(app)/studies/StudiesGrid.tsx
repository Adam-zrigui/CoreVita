"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search, FileText, Eye, Calendar, Activity, Share2,
  ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square,
  Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";

interface StudyItem {
  id: string;
  studyUid: string;
  patientName: string | null;
  patientId: string | null;
  modality: string | null;
  studyDate: string | null;
  slices: number;
  status: string;
  description: string | null;
  createdAt: Date;
  _count: { series: number; reports: number; shareTokens: number };
}

const MODALITY_COLORS: Record<string, string> = {
  MR: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  CT: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  CR: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  DX: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  XA: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  US: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  NM: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  PT: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  MG: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  OT: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

function modalityColor(modality: string | null): string {
  return MODALITY_COLORS[modality ?? ""] ?? MODALITY_COLORS.OT;
}

function modalityLetter(modality: string | null): string {
  if (!modality) return "?";
  if (modality === "MR") return "M";
  if (modality === "CT") return "C";
  if (modality === "CR" || modality === "DX") return "X";
  if (modality === "XA") return "A";
  if (modality === "US") return "U";
  if (modality === "NM" || modality === "PT") return "N";
  if (modality === "MG") return "G";
  return modality.charAt(0);
}

type SortField = "patientName" | "studyDate" | "createdAt" | "status";
type SortDir = "asc" | "desc";

export function StudiesGrid({ studies, page, totalPages }: { studies: StudyItem[]; page: number; totalPages: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const modalities = useMemo(() => {
    const m = new Set(studies.map((s) => s.modality).filter((x): x is string => !!x));
    return [...m].sort();
  }, [studies]);

  const filtered = useMemo(() => {
    let result = studies.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (s.patientName ?? "").toLowerCase();
        const desc = (s.description ?? "").toLowerCase();
        const uid = s.studyUid.toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !uid.includes(q)) return false;
      }
      if (modalityFilter && s.modality !== modalityFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "patientName":
          cmp = (a.patientName ?? "").localeCompare(b.patientName ?? "");
          break;
        case "studyDate":
          cmp = (a.studyDate ?? "").localeCompare(b.studyDate ?? "");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [studies, search, modalityFilter, sortField, sortDir]);

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }, [filtered, selected]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const batchDelete = useCallback(async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = [...selected];
    try {
      const res = await fetch("/api/studies/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        toast.success(`${ids.length} study${ids.length === 1 ? "" : "ies"} deleted`);
        setSelected(new Set());
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
    setDeleting(false);
  }, [selected, router]);

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "border-amber-500/20 bg-amber-500/8 text-amber-400";
      case "READING": return "border-blue-500/20 bg-blue-500/8 text-blue-400";
      case "REPORTED": return "border-emerald-500/20 bg-emerald-500/8 text-emerald-400";
      default: return "border-slate-500/20 bg-slate-500/8 text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, description, or UID..."
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-2 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500/50"
          />
        </div>
        {modalities.length > 1 && (
          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500/50 sm:w-40"
          >
            <option value="">All modalities</option>
            {modalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-1">
          {(["patientName", "studyDate", "createdAt", "status"] as const).map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-medium transition-colors ${
                sortField === field
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
              }`}
            >
              {field === "patientName" ? "Name" : field === "studyDate" ? "Date" : field === "createdAt" ? "Uploaded" : "Status"}
              {sortField === field ? (
                sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
              ) : (
                <ArrowUpDown className="h-3 w-3 opacity-40" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-30 -mx-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 backdrop-blur-xl shadow-[0_4px_24px_-8px] shadow-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-[10px] font-semibold text-emerald-400">
                {selected.size}
              </div>
              <span className="text-xs font-medium text-emerald-400">selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg px-3 py-1 text-[10px] text-slate-400 transition-all hover:bg-white/[0.06] active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={batchDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-3 py-1 text-[10px] font-semibold text-white shadow-sm transition-all hover:from-red-500 hover:to-red-400 active:scale-95 disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
                {deleting ? "Deleting..." : `Delete`}
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] py-16">
          <FileText className="mb-3 h-10 w-10 text-slate-700" />
          <p className="text-sm text-slate-500">
            {search || modalityFilter ? "No studies match your search" : "No studies yet"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((study) => {
              const isSelected = selected.has(study.id);
              return (
                <div
                  key={study.id}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                    isSelected
                      ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-[0_0_24px_-4px] shadow-emerald-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_0_30px_-8px] hover:shadow-emerald-500/5"
                  }`}
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 h-full w-0.5 transition-opacity duration-300 ${
                    isSelected ? "bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-100" : "opacity-0 group-hover:opacity-60"
                  } ${modalityColor(study.modality).includes("emerald") ? "bg-gradient-to-b from-emerald-400 to-emerald-600" :
                    modalityColor(study.modality).includes("sky") ? "bg-gradient-to-b from-sky-400 to-sky-600" :
                    modalityColor(study.modality).includes("blue") ? "bg-gradient-to-b from-blue-400 to-blue-600" :
                    modalityColor(study.modality).includes("rose") ? "bg-gradient-to-b from-rose-400 to-rose-600" :
                    modalityColor(study.modality).includes("amber") ? "bg-gradient-to-b from-amber-400 to-amber-600" :
                    modalityColor(study.modality).includes("violet") ? "bg-gradient-to-b from-violet-400 to-violet-600" :
                    modalityColor(study.modality).includes("pink") ? "bg-gradient-to-b from-pink-400 to-pink-600" :
                    "bg-gradient-to-b from-slate-400 to-slate-600"}`} />
                  <div className="p-5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleOne(study.id)}
                    className="absolute top-3 left-3 z-10 rounded p-0.5 text-slate-600 opacity-0 transition-all hover:text-emerald-400 group-hover:opacity-100"
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
                  </button>
                  <Link href={`/studies/${study.id}`} className="block">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold uppercase leading-none shadow-sm transition-shadow duration-300 group-hover:shadow-md ${modalityColor(study.modality)}`}>
                        {modalityLetter(study.modality)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-emerald-400">
                          {study.patientName || "Unknown Patient"}
                        </h3>
                        {study.patientId && (
                          <p className="mt-0.5 text-xs text-slate-600">ID: {study.patientId}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor(study.status)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          study.status === "PENDING" ? "bg-amber-400" :
                          study.status === "READING" ? "bg-blue-400" :
                          study.status === "REPORTED" ? "bg-emerald-400" : "bg-slate-400"
                        }`} />
                        {study.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      {study.studyDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {study.studyDate}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                      <span>{study._count.series} series</span>
                      <span>{study.slices} slices</span>
                      <span>{study._count.reports} report{study._count.reports !== 1 ? "s" : ""}</span>
                    </div>

                    {study.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{study.description}</p>
                    )}

                    <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-3">
                      <div className="flex items-center gap-1.5 text-slate-600 transition-colors group-hover:text-emerald-400">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">Open</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Share2 className="h-3.5 w-3.5" />
                        <span className="text-xs">{study._count.shareTokens}</span>
                      </div>
                      <Activity className="ml-auto h-3.5 w-3.5 text-slate-700 transition-all group-hover:text-emerald-400 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-6 pb-2">
              {page > 1 ? (
                <Link
                  href={`/studies?page=${page - 1}`}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 active:scale-95"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-700">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </span>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/studies?page=${p}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-400 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                      : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 active:scale-90"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={`/studies?page=${page + 1}`}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 active:scale-95"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-700">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

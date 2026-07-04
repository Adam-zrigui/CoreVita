"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, User, ChevronRight, Calendar, Activity, Loader2 } from "lucide-react";

type PatientSummary = {
  patientId: string | null;
  patientName: string | null;
  studyCount: number;
  latestStudyDate: string | null;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    fetch(`/api/patients?${params}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPatients(data.patients ?? []); })
      .catch(() => { if (!cancelled) setPatients([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <User className="h-5 w-5 text-slate-500" />
          <h1 className="text-xl font-semibold tracking-tight text-white">Patients</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">All patients with studies you have uploaded</p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients by name or ID..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-emerald-500/30 focus:bg-white/[0.06]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <User className="h-10 w-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">
            {search ? "No patients match your search" : "No patients yet — upload a study to get started"}
          </p>
          {!search && (
            <Link
              href="/upload"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Upload a study
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => {
            const patientKey = encodeURIComponent(p.patientId ?? "_unknown");
            return (
              <Link
                key={patientKey}
                href={`/patients/${patientKey}`}
                className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 ring-1 ring-white/[0.04]">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {p.patientName ?? "Unknown Patient"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-600">
                      {p.patientId && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          ID: {p.patientId}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {p.latestStudyDate ?? "No date"}
                      </span>
                      <span>{p.studyCount} study{p.studyCount !== 1 ? "ies" : "y"}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

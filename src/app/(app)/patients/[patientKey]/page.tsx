"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Eye, Calendar, Activity, Clock, Layers, Loader2 } from "lucide-react";

type StudySummary = {
  id: string;
  studyUid: string;
  patientName: string | null;
  title: string | null;
  modality: string | null;
  studyDate: string | null;
  slices: number;
  status: string;
  description: string | null;
  createdAt: string;
  _count: { series: number };
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientKey: string }>;
}) {
  const { patientKey } = use(params);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/patients/${encodeURIComponent(patientKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPatientName(data.patientName);
        setPatientId(data.patientId);
        setStudies(data.studies ?? []);
      })
      .catch(() => { if (!cancelled) setStudies([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientKey]);

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "border-amber-500/20 bg-amber-500/10 text-amber-400";
      case "READING": return "border-blue-500/20 bg-blue-500/10 text-blue-400";
      case "REPORTED": return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
      default: return "border-slate-500/20 bg-slate-500/10 text-slate-400";
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-amber-400";
      case "READING": return "bg-blue-400";
      case "REPORTED": return "bg-emerald-400";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <Link
          href="/patients"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All patients
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 ring-1 ring-white/[0.06]">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {patientName ?? "Unknown Patient"}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                {patientId && (
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5" />
                    ID: {patientId}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {studies.length} study{studies.length !== 1 ? "ies" : ""}
                </span>
              </div>
            </div>
          </div>

          {studies.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-16 text-center">
              <p className="text-sm text-slate-500">No studies found for this patient</p>
            </div>
          ) : (
            <div className="space-y-2">
              {studies.map((s) => (
                <Link
                  key={s.id}
                  href={`/studies/${s.studyUid}`}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/[0.02]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-400 ring-1 ring-white/[0.04]">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {s.title ?? s.patientName ?? "Untitled Study"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-600">
                        {s.modality && <span>{s.modality}</span>}
                        {s.studyDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {s.studyDate}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                        <span>{s._count.series} series</span>
                        <span>{s.slices} slices</span>
                      </div>
                      {s.description && (
                        <p className="mt-1 truncate text-[11px] text-slate-600">{s.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusColor(s.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot(s.status)}`} />
                      {s.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

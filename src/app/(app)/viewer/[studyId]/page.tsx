"use client";

import { use, useEffect, useState } from "react";
import { DynamicViewer } from "@/components/DynamicViewer";

type Series = {
  id: string;
  seriesUid: string;
  modality?: string | null;
  instanceCount: number;
  firstImageId?: string | null;
  equipment?: {
    manufacturer?: string | null;
    manufacturerModelName?: string | null;
    stationName?: string | null;
    institutionName?: string | null;
    institutionalDepartmentName?: string | null;
    deviceSerialNumber?: string | null;
    softwareVersions?: string | null;
  };
};

type ViewerPayload = {
  study: {
    id: string;
    studyUid: string;
    patientName?: string | null;
    title?: string | null;
    studyDate?: string | null;
    description?: string | null;
    status: string;
    series: Series[];
  };
  imageIds: string[];
  total: number;
  plan: "starter" | "pro" | "enterprise";
};

export default function ViewerPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = use(params);
  return <ViewerLoader key={studyId} studyId={studyId} />;
}

function ViewerLoader({ studyId }: { studyId: string }) {
  const [data, setData] = useState<ViewerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/studies/${studyId}/viewer`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json() as Promise<ViewerPayload>;
      })
      .then((payload) => {
        if (!cancelled) {
          console.log("[viewer] API payload total:", payload.total, "imageIds:", payload.imageIds?.length);
          setData(payload);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => { cancelled = true; };
  }, [studyId]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-8 py-10">
        <div className="max-w-lg rounded-xl border border-red-500/20 bg-red-500/[0.02] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">Study could not be loaded</h1>
          <p className="mt-2 break-words text-sm text-red-400/75">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen flex-col">
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400" />
            <p className="text-sm text-slate-500">Loading study...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <DynamicViewer
      study={data.study}
      imageIds={data.imageIds}
      total={data.total}
      plan={data.plan}
    />
  );
}

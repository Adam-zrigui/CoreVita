"use client";

import { useState, memo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";

type Props = {
  studyUid: string;
};

export const DeleteStudyButton = memo(function DeleteStudyButton({ studyUid }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/studies?studyUid=${encodeURIComponent(studyUid)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        try {
          router.refresh();
        } catch {
          window.location.reload();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete study");
      }
    } catch {
      alert("Network error");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Confirm?
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
      title="Delete study"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  );
});

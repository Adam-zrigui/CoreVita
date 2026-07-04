"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, X, Lock, Globe } from "lucide-react";

interface ShareModalProps {
  studyId: string;
  studyUid: string;
  onClose: () => void;
  onShare?: () => void;
  plan?: "starter" | "pro" | "enterprise";
}

export function ShareModal({ studyId, onClose, onShare, plan = "starter" }: ShareModalProps) {
  const isPaid = plan === "pro" || plan === "enterprise";
  const [expiryDays, setExpiryDays] = useState(7);
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyId,
          expiresInDays: expiryDays,
          password: password || undefined,
          allowDownload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create share link");
      setShareUrl(data.url);
      onShare?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; clearTimeout(copyRef.current); }; }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      clearTimeout(copyRef.current);
      copyRef.current = setTimeout(() => { if (mountedRef.current) setCopied(false); }, 2000);
    } catch {
      const input = document.querySelector<HTMLInputElement>("#share-url-input");
      input?.select();
      document.execCommand("copy");
    }
  };

  const revokeLink = () => {
    setShareUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="share-modal">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          data-testid="share-modal-close"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Globe className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">Share Study</h2>
        <p className="mt-1 text-sm text-slate-500">
          Generate a secure link to share this study with anyone.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Expires in</label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              disabled={!isPaid}
              className="mt-1.5 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={7}>1 week</option>
              {isPaid && <option value={14}>2 weeks</option>}
              {isPaid && <option value={30}>1 month</option>}
            </select>
            {!isPaid && (
              <p className="mt-1 text-[10px] text-slate-600">Upgrade to Pro for longer expiry options</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400">
              Password protection <span className="text-slate-600">(optional)</span>
              {!isPaid && <span className="ml-2 text-[10px] text-amber-400">Pro feature</span>}
            </label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isPaid}
                placeholder={isPaid ? "Leave blank for no password" : "Upgrade to Pro to set a password"}
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-2 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {!isPaid && (
              <p className="mt-1 text-[10px] text-slate-600">Password protection is available on Pro and above</p>
            )}
          </div>

          <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${!isPaid ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <input
              type="checkbox"
              checked={isPaid ? allowDownload : false}
              onChange={(e) => { if (isPaid) setAllowDownload(e.target.checked); }}
              disabled={!isPaid}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-blue-500 focus:ring-blue-500/30 disabled:opacity-50"
            />
            <div>
              <div className="text-sm font-medium text-slate-200">
                Allow download
                {!isPaid && <span className="ml-2 text-[10px] text-amber-400">Pro feature</span>}
              </div>
              <div className="text-xs text-slate-600">Viewers can download the original DICOM files</div>
            </div>
          </label>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-2 text-xs text-red-400">{error}</div>
          )}

          {!shareUrl ? (
            <button
              onClick={generateLink}
              disabled={loading}
              data-testid="share-generate"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                "Generate Share Link"
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <input
                  id="share-url-input"
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-sm text-slate-300 outline-none"
                />
                <button
                  onClick={copyLink}
                  data-testid="share-copy"
                  className="shrink-0 rounded-md bg-white/[0.06] p-1.5 text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-slate-200"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={revokeLink}
                  className="flex-1 rounded-lg border border-white/[0.06] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
                >
                  Revoke link
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

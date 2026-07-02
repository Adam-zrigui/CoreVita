"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/firebase/auth";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4" data-testid="reset-form">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400" data-testid="reset-error">
          {error}
        </div>
      )}

      {sent && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-400" data-testid="reset-sent">
          Check your email for the password reset link.
        </div>
      )}

      <div>
        <label htmlFor="reset-email" className="sr-only">Email address</label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          autoComplete="email"
          disabled={loading || sent}
          className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={loading || sent}
        data-testid="reset-submit"
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : sent ? "Email sent" : "Send reset link"}
      </button>
    </form>
  );
}

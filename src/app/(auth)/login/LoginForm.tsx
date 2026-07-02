"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signInWithEmail, sendVerificationEmail, auth } from "@/lib/firebase/auth";
import { signOut as fbSignOut } from "firebase/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        if (!user.emailVerified) {
          setUnverifiedEmail(email);
          await fbSignOut(auth);
          setLoading(false);
          return;
        }

        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (res.ok) {
          const redirect = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
          window.location.href = redirect;
        } else {
          const data = await res.json();
          setError(data.error ?? "Signed in, but session setup failed. Please try again.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResent(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      await sendVerificationEmail();
      await fbSignOut(auth);
    } catch (e) {
      console.error("[login] resend verification failed:", e);
    }
  };

  if (unverifiedEmail) {
    return (
      <div className="mt-7 text-center" data-testid="unverified-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/5 shadow-lg shadow-amber-500/10">
          <MailCheck className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="mt-5 text-base font-semibold text-white">Email not verified</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Please verify your email address before signing in.
          We sent a verification email to <strong className="text-slate-300">{unverifiedEmail}</strong>.
        </p>

        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resent}
          className="mt-4 w-full rounded-lg bg-white/6 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
        >
          {resent ? "Verification email sent" : "Resend verification email"}
        </button>

        <button
          type="button"
          onClick={() => { setUnverifiedEmail(null); setError(null); }}
          className="mt-2 w-full rounded-lg px-4 py-2.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4" data-testid="login-form">
      {error && (
        <div id="login-error" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400" data-testid="login-error" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="sr-only">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          autoComplete="email"
          disabled={loading}
          aria-describedby={error ? "login-error" : undefined}
          className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="password" className="sr-only">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          disabled={loading}
          aria-describedby={error ? "login-error" : undefined}
          className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div className="flex justify-end">
        <Link
          href="/reset-password"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        data-testid="login-submit"
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

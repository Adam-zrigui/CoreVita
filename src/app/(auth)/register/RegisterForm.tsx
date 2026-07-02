"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { signUpWithEmail, signInWithEmail, sendVerificationEmail, auth } from "@/lib/firebase/auth";
import { signOut as fbSignOut } from "firebase/auth";

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "20%" };
  if (score <= 2) return { label: "Fair", color: "bg-amber-500", width: "40%" };
  if (score <= 3) return { label: "Good", color: "bg-blue-500", width: "60%" };
  if (score <= 4) return { label: "Strong", color: "bg-emerald-500", width: "80%" };
  return { label: "Very strong", color: "bg-emerald-400", width: "100%" };
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const user = await signUpWithEmail(email, password, name.trim());
      if (user) {
        await sendVerificationEmail();
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, name: name.trim() }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Account created, but setup failed. Please try signing in.");
          setLoading(false);
          return;
        }

        await fbSignOut(auth);
        setRegisteredEmail(email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      await sendVerificationEmail();
      await fbSignOut(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend verification email");
    }
  };

  if (registeredEmail) {
    return (
      <div className="mt-7 text-center" data-testid="verify-email-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 shadow-lg shadow-emerald-500/10">
          <MailCheck className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="mt-5 text-base font-semibold text-white">Verify your email</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          We sent a verification email to <strong className="text-slate-300">{registeredEmail}</strong>.
          Click the link in the email to activate your account, then sign in.
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={resent}
          className="mt-4 w-full rounded-lg bg-white/6 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-40"
        >
          {resent ? "Verification email sent" : "Resend verification email"}
        </button>

        <a
          href="/login"
          className="mt-3 block w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] text-center"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4" data-testid="register-form">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400" data-testid="register-error">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="sr-only">Full name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          disabled={loading}
          className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
        />
      </div>

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
          className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="password" className="sr-only">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters)"
            autoComplete="new-password"
            disabled={loading}
            className="w-full rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-blue-500/40 focus:bg-white/6 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
            </div>
            <span className={`text-[10px] font-medium ${strength.color.replace("bg-", "text-")}`}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        data-testid="register-submit"
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-sky-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/3 blur-[100px]" />
      </div>

      <Link
        href="/login"
        className="absolute left-5 top-5 z-10 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/4 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 backdrop-blur-2xl shadow-2xl shadow-emerald-500/5">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/[0.04] pointer-events-none" />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/5 shadow-lg shadow-emerald-500/10">
            <img src="/favicon.png" alt="" className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-white text-center">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-slate-500 text-center">
            Enter your email and we&apos;ll send you a reset link
          </p>

          <ResetPasswordForm />

          <p className="mt-6 text-center text-xs text-slate-600">
            Remember your password?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

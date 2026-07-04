"use client";

import { useEffect, useRef } from "react";
import { signInWithCustomToken, getIdToken } from "@/lib/auth/client";

export function ActivateSession({
  customToken,
  userId,
  returnPath,
}: {
  customToken: string;
  userId: string;
  returnPath?: string;
}) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    (async () => {
      try {
        await signInWithCustomToken(customToken);
        const idToken = await getIdToken();
        const res = await fetch("/api/auth/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) throw new Error("Session creation failed");
        window.location.href = returnPath || "/dashboard";
      } catch (err) {
        console.error("[ActivateSession] Re-auth failed:", err);
        window.location.href = `/login?error=session_expired`;
      }
    })();
  }, [customToken, userId, returnPath]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Activating your subscription...</p>
      </div>
    </div>
  );
}

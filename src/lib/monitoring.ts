export type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    try {
      const body = JSON.stringify({
        exception: { values: [{ type: error instanceof Error ? error.constructor.name : "Error", value: message, stacktrace: stack ? { frames: parseStackFrames(stack) } : undefined }] },
        extra: context,
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
      });
      fetch("https://o4508681867034624.ingest.us.sentry.io/api/4508681871368192/envelope/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    } catch {
    }
  }

  console.error(`[monitoring] ${message}`, context ?? "", stack ?? "");
}

function parseStackFrames(stack: string): { filename?: string; lineno?: number; function?: string }[] {
  return stack.split("\n").slice(1).map((line) => {
    const match = line.match(/at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|(.+))\)?/);
    if (!match) return {};
    return { function: match[1] || "<anonymous>", filename: match[2] || match[5], lineno: match[3] ? Number(match[3]) : undefined };
  });
}

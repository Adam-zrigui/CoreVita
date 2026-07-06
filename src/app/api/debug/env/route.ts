import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const sensitiveKeys = ["SECRET", "KEY", "TOKEN", "PASSWORD", "SIGNING"];
  const vars: Record<string, { length: number; hasCRLF: boolean; hasTrailingNL: boolean; preview: string }> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== "string") continue;
    const hasCRLF = value.includes("\r") || value.includes("\n");
    const hasTrailingNL = value.endsWith("\r") || value.endsWith("\n") || value.endsWith("\r\n");
    const isSensitive = sensitiveKeys.some((k) => key.toUpperCase().includes(k));
    vars[key] = {
      length: value.length,
      hasCRLF,
      hasTrailingNL,
      preview: isSensitive
        ? `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`
        : `${value.slice(0, 60)}${value.length > 60 ? "..." : ""}`,
    };
  }

  const issues = Object.fromEntries(
    Object.entries(vars).filter(([, v]) => v.hasCRLF || v.hasTrailingNL)
  );

  return NextResponse.json({ total: Object.keys(vars).length, issues });
}

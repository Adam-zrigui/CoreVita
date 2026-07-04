import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows first request", () => {
    const result = rateLimit("test-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks when limit exceeded", () => {
    const key = `test-exceed-${Date.now()}`;
    for (let i = 0; i < 4; i++) {
      const r = rateLimit(key, 3, 60_000);
      if (i < 3) expect(r.allowed).toBe(true);
      else expect(r.allowed).toBe(false);
    }
  });

  it("resets after window expires", async () => {
    const key = `test-reset-${Date.now()}`;
    rateLimit(key, 1, 50);
    const blocked = rateLimit(key, 1, 50);
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));
    const after = rateLimit(key, 1, 50);
    expect(after.allowed).toBe(true);
  });

  it("tracks remaining correctly", () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = rateLimit(key, 5, 60_000);
    expect(r1.remaining).toBe(4);
    const r2 = rateLimit(key, 5, 60_000);
    expect(r2.remaining).toBe(3);
  });
});

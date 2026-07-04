import { describe, it, expect } from "vitest";
import { getPlanLimits, getMaxUsers, getStudyLimit, planHasFeature, isFreeTier } from "./plans";

describe("plans", () => {
  it("starter: 3 studies, 1 user, no features", () => {
    const limits = getPlanLimits("starter");
    expect(limits.studies).toBe(3);
    expect(limits.users).toBe(1);
    expect(limits.features).toHaveLength(0);
    expect(getStudyLimit("starter")).toBe(3);
    expect(getMaxUsers("starter")).toBe(1);
    expect(isFreeTier("starter")).toBe(true);
  });

  it("pro: unlimited studies, 5 users, has audit_log", () => {
    const limits = getPlanLimits("pro");
    expect(limits.studies).toBe(999999);
    expect(limits.users).toBe(5);
    expect(planHasFeature("pro", "audit_log")).toBe(true);
    expect(planHasFeature("pro", "custom_branding")).toBe(false);
    expect(isFreeTier("pro")).toBe(false);
  });

  it("enterprise: unlimited studies, unlimited users, all features", () => {
    const limits = getPlanLimits("enterprise");
    expect(limits.studies).toBe(999999);
    expect(limits.users).toBe(999999);
    expect(planHasFeature("enterprise", "custom_branding")).toBe(true);
    expect(planHasFeature("enterprise", "api_access")).toBe(true);
    expect(isFreeTier("enterprise")).toBe(false);
  });
});

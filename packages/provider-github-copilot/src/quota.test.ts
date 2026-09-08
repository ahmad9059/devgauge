import { describe, expect, it } from "vitest";

import type { CopilotQuota } from "./schema.js";
import { normalizeQuota } from "./normalize.js";
import { quotaToUsage } from "./quota.js";

const premium = (overrides: Partial<CopilotQuota["quotaSnapshots"][string]> = {}): CopilotQuota => ({
  quotaSnapshots: {
    premium_interactions: {
      entitlementRequests: 1000,
      usedRequests: 430,
      remainingPercentage: 57,
      resetDate: "2026-10-01T00:00:00Z",
      ...overrides,
    },
  },
});

describe("normalizeQuota", () => {
  it("normalizes a finite bucket and computes used percent from remaining", () => {
    const { windows } = normalizeQuota(premium());
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      id: "premium_interactions",
      usedPercent: 43,
      remainingPercent: 57,
      used: 430,
      limit: 1000,
      unit: "requests",
      resetsAt: "2026-10-01T00:00:00Z",
    });
  });

  it("treats entitlementRequests === -1 as unlimited (no used percent)", () => {
    const { windows } = normalizeQuota({
      quotaSnapshots: { unlimited: { entitlementRequests: -1, usedRequests: 120, remainingPercentage: null, resetDate: null } },
    });
    expect(windows[0]).toMatchObject({ id: "unlimited", usedPercent: null, limit: null, used: 120 });
  });

  it("preserves unknown bucket ids without an allowlist", () => {
    const { windows } = normalizeQuota({
      quotaSnapshots: {
        brand_new_bucket_xyz: { entitlementRequests: 500, usedRequests: 10, remainingPercentage: 98, resetDate: null },
      },
    });
    expect(windows[0].id).toBe("brand_new_bucket_xyz");
    expect(windows[0].label).toBe("Brand New Bucket Xyz");
  });

  it("handles null remaining percentage (unknown used percent)", () => {
    const { windows } = normalizeQuota({
      quotaSnapshots: { odd: { entitlementRequests: 500, usedRequests: null, remainingPercentage: null, resetDate: null } },
    });
    expect(windows[0].usedPercent).toBeNull();
    expect(windows[0].state).toBe("unknown");
  });

  it("clamps used percent derived from out-of-range remaining", () => {
    const { windows } = normalizeQuota(premium({ remainingPercentage: 200 }));
    expect(windows[0].usedPercent).toBe(0);
  });
});

describe("quotaToUsage", () => {
  it("produces a full provider usage snapshot with dynamic buckets", () => {
    const quota: CopilotQuota = {
      quotaSnapshots: {
        premium_interactions: { entitlementRequests: 1000, usedRequests: 430, remainingPercentage: 57, resetDate: "2026-10-01T00:00:00Z" },
        another_bucket: { entitlementRequests: -1, usedRequests: 5, remainingPercentage: null, resetDate: null },
      },
    };
    const usage = quotaToUsage(quota, new Date("2026-09-05T12:00:00.000Z"));
    expect(usage.provider).toBe("github-copilot");
    expect(usage.windows.map((w) => w.id)).toEqual(["premium_interactions", "another_bucket"]);
    expect(usage.fetchedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(usage.source).toBe("official-api");
    expect(JSON.stringify(usage)).not.toContain("token");
  });
});
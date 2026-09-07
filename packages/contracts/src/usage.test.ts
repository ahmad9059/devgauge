import { describe, expect, it } from "vitest";

import { providerUsageSchema, usageWindowSchema } from "./usage.js";
import { allProviderUsageFixtures, providerUsageFixture } from "./fixtures.js";
import { PROVIDER_DISPLAY_ORDER } from "./provider.js";

describe("usageWindowSchema", () => {
  it("accepts a valid window", () => {
    const result = usageWindowSchema.safeParse({
      id: "rolling",
      label: "5 hour",
      usedPercent: 12,
      remainingPercent: 88,
      used: null,
      limit: null,
      unit: "percent",
      windowSeconds: 18000,
      resetsAt: "2026-09-05T18:00:00.000Z",
      state: "normal",
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range display percentages (they must be clamped upstream)", () => {
    const result = usageWindowSchema.safeParse({
      id: "rolling",
      label: "5 hour",
      usedPercent: 115,
      remainingPercent: -15,
      used: null,
      limit: null,
      unit: "percent",
      windowSeconds: 18000,
      resetsAt: "2026-09-05T18:00:00.000Z",
      state: "normal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reset timestamps", () => {
    const result = usageWindowSchema.safeParse({
      id: "rolling",
      label: "5 hour",
      usedPercent: 12,
      remainingPercent: 88,
      used: null,
      limit: null,
      unit: "percent",
      windowSeconds: 18000,
      resetsAt: "not-a-date",
      state: "normal",
    });
    expect(result.success).toBe(false);
  });
});

describe("providerUsageSchema", () => {
  it("accepts every synthetic fixture in display order", () => {
    const fixtures = allProviderUsageFixtures();
    expect(fixtures.map((f) => f.provider)).toEqual([...PROVIDER_DISPLAY_ORDER]);
    for (const fixture of fixtures) {
      const result = providerUsageSchema.safeParse(fixture);
      expect(result.success, `fixture for ${fixture.provider} must validate`).toBe(true);
    }
  });

  it("keeps unknown window IDs without an allowlist", () => {
    const fixture = providerUsageFixture("github-copilot");
    fixture.windows = [
      {
        ...fixture.windows[0]!,
        id: "some_future_bucket",
      },
    ];
    const result = providerUsageSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });
});
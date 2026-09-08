import { describe, expect, it } from "vitest";

import { alertRuleInputSchema, alertRuleSchema } from "./alerts.js";
import { historySeriesResponseSchema } from "./history.js";

describe("history series contract", () => {
  it("accepts a raw resolution series with points and events", () => {
    const result = historySeriesResponseSchema.safeParse({
      schemaVersion: 1,
      provider: "codex",
      windowId: "weekly",
      requestedResolution: "raw",
      effectiveResolution: "raw",
      timezone: "Europe/Berlin",
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-08T00:00:00.000Z",
      retentionStartsAt: "2025-08-01T00:00:00.000Z",
      points: [
        {
          snapshotId: "eccd6c1e-0a2a-4f44-8c7e-0f6a1b2c3d4e",
          provider: "codex",
          windowId: "weekly",
          label: "Weekly",
          timestamp: "2026-09-07T12:00:00.000Z",
          usedPercent: 62,
          remainingPercent: 38,
          used: null,
          limit: null,
          unit: "percent",
          resetsAt: null,
          state: "normal",
          stale: false,
          source: "official-api",
        },
      ],
      events: [],
      insight: "Usage increased by 4 percentage points across this range.",
      nextCursor: null,
      hasMore: false,
    });
    expect(result.success).toBe(true);
  });

  it("preserves unknown window identifiers", () => {
    const schema = historySeriesResponseSchema.shape.points.element.shape.windowId;
    expect(schema.safeParse("custom-limit-id").success).toBe(true);
  });
});

describe("alert rule contract", () => {
  it("requires a threshold for percentage alerts", () => {
    expect(alertRuleInputSchema.safeParse({ kind: "consumed_threshold", threshold: null }).success).toBe(false);
    expect(alertRuleInputSchema.safeParse({ kind: "consumed_threshold", threshold: 80 }).success).toBe(true);
  });

  it("accepts a fully formed rule", () => {
    const result = alertRuleSchema.safeParse({
      id: "eccd6c1e-0a2a-4f44-8c7e-0f6a1b2c3d4e",
      provider: "codex",
      windowId: "weekly",
      kind: "remaining_threshold",
      threshold: 20,
      hysteresis: 5,
      enabled: true,
      critical: false,
      preview: "generic",
      quietHours: { enabled: true, start: "22:00", end: "07:00", timezone: "Europe/Berlin" },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import type { HistoryPoint } from "@devgauge/contracts";

import { decodeHistoryCursor, deriveHistoryEvents, historyInsight } from "./history-service.js";

const point = (overrides: Partial<HistoryPoint> & { timestamp: string }): HistoryPoint => ({
  snapshotId: "eccd6c1e-0a2a-4f44-8c7e-0f6a1b2c3d4e",
  provider: "codex",
  windowId: "weekly",
  label: "Weekly",
  usedPercent: 40,
  remainingPercent: 60,
  used: null,
  limit: null,
  unit: "percent",
  resetsAt: null,
  state: "normal",
  stale: false,
  source: "official-api",
  ...overrides,
});

describe("history service", () => {
  it("round-trips an opaque cursor", () => {
    const cursor = decodeHistoryCursor(
      Buffer.from(JSON.stringify({ at: "2026-09-07T12:00:00.000Z", id: "eccd6c1e-0a2a-4f44-8c7e-0f6a1b2c3d4e" })).toString("base64url")
    );
    expect(cursor.id).toBe("eccd6c1e-0a2a-4f44-8c7e-0f6a1b2c3d4e");
    expect(cursor.at.toISOString()).toBe("2026-09-07T12:00:00.000Z");
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeHistoryCursor("not-base64!!")).toThrow(TypeError);
    const badId = Buffer.from(JSON.stringify({ at: "2026-09-07T12:00:00.000Z", id: "../etc" })).toString("base64url");
    expect(() => decodeHistoryCursor(badId)).toThrow(TypeError);
  });

  // The series service receives points newest-first (matching API ordering).
  it("derives stale and reset events from a newest-first series", () => {
    const events = deriveHistoryEvents([
      point({ timestamp: "2026-09-08T08:00:00.000Z", resetsAt: "2026-09-10T00:00:00.000Z" }),
      point({ timestamp: "2026-09-07T08:00:00.000Z", resetsAt: "2026-09-05T00:00:00.000Z", stale: true }),
      point({ timestamp: "2026-09-06T08:00:00.000Z", resetsAt: "2026-09-05T00:00:00.000Z" }),
    ]);
    const types = events.map((event) => event.type);
    expect(types).toContain("stale");
    expect(types).toContain("reset");
  });

  it("derives a gap event for an interval with no confirmed samples", () => {
    const events = deriveHistoryEvents([
      point({ timestamp: "2026-09-08T08:00:00.000Z", resetsAt: "2026-09-10T00:00:00.000Z" }),
      point({ timestamp: "2026-09-01T08:00:00.000Z", resetsAt: "2026-09-05T00:00:00.000Z" }),
    ]);
    expect(events.some((event) => event.type === "gap")).toBe(true);
  });

  it("describes an upward trend from newest-first points", () => {
    const insight = historyInsight([
      point({ timestamp: "2026-09-03T08:00:00.000Z", usedPercent: 48 }),
      point({ timestamp: "2026-09-02T08:00:00.000Z", usedPercent: 35 }),
      point({ timestamp: "2026-09-01T08:00:00.000Z", usedPercent: 20 }),
    ]);
    expect(insight).toContain("increased");
    expect(insight).toContain("28");
  });

  it("asks for more samples when a trend is not yet available", () => {
    expect(historyInsight([point({ timestamp: "2026-09-01T08:00:00.000Z", usedPercent: 20 })])).toContain("More confirmed samples");
  });
});

import { describe, expect, it } from "vitest";

import {
  clampPercent,
  normalizeWindow,
  remainingPercent,
  toIsoUtcFromEpochSeconds,
  windowStateFromPercent,
} from "./normalize.js";

describe("clampPercent", () => {
  it("clamps out-of-range values to 0..100", () => {
    expect(clampPercent(115)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
  });

  it("preserves in-range and null values", () => {
    expect(clampPercent(42)).toBe(42);
    expect(clampPercent(null)).toBeNull();
    expect(clampPercent(undefined)).toBeNull();
  });
});

describe("remainingPercent", () => {
  it("computes remaining only when used is known", () => {
    expect(remainingPercent(25)).toBe(75);
    expect(remainingPercent(null)).toBeNull();
  });
});

describe("toIsoUtcFromEpochSeconds", () => {
  it("converts epoch seconds to ISO UTC", () => {
    expect(toIsoUtcFromEpochSeconds(1788600000)).toBe(
      new Date(1788600000 * 1000).toISOString()
    );
    expect(toIsoUtcFromEpochSeconds(null)).toBeNull();
  });
});

describe("windowStateFromPercent", () => {
  it("classifies normal, warning, limited, and unknown", () => {
    expect(windowStateFromPercent(25)).toBe("normal");
    expect(windowStateFromPercent(85)).toBe("warning");
    expect(windowStateFromPercent(100)).toBe("limited");
    expect(windowStateFromPercent(120)).toBe("limited");
    expect(windowStateFromPercent(null)).toBe("unknown");
  });
});

describe("normalizeWindow", () => {
  it("clamps display values and preserves state", () => {
    const window = normalizeWindow({
      id: "rolling",
      label: "5 hour",
      usedPercent: 115,
      windowSeconds: 18000,
      resetsAt: "2026-09-05T18:00:00.000Z",
    });
    expect(window.usedPercent).toBe(100);
    expect(window.remainingPercent).toBe(0);
    expect(window.state).toBe("limited");
  });
});
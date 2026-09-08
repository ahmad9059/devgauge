import { describe, expect, it } from "vitest";

import { hasProhibitedKey, minimizeStatusLine, previewRedaction, MinimizeError } from "./minimize.js";
import { minimizeToUsage } from "./normalize.js";
import { rawStatusLineFixture } from "./__fixtures__/fixtures.js";

const meta = { deviceId: "dev_123", capturedAt: "2026-09-05T12:00:00.000Z", localSequence: 1 };

const LEVENSHTEIN_SENSITIVE = [
  "user@example.com",
  "sess_abc123",
  "/home/user/.claude",
  "feature/login",
  "octocat/myapp",
  "oauth_token_present",
];

describe("minimizeStatusLine (data minimization)", () => {
  it("keeps only allowlisted rate-limit windows from a hostile full statusLine", () => {
    const out = minimizeStatusLine(rawStatusLineFixture(), meta);
    expect(out.schemaVersion).toBe(1);
    expect(out.deviceId).toBe("dev_123");
    expect(out.capturedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(out.rateLimits).toEqual({
      five_hour: { used_percentage: 23.5, resets_at: 1788600000 },
      seven_day: { used_percentage: 41.2, resets_at: 1789000000 },
      spend_limit: { used_percentage: 10, resets_at: 1789600000 },
    });
  });

  it("never leaks any sensitive field from the raw input", () => {
    const out = minimizeStatusLine(rawStatusLineFixture(), meta);
    const serialized = JSON.stringify(out);
    for (const needle of LEVENSHTEIN_SENSITIVE) {
      expect(serialized).not.toContain(needle);
    }
    expect(serialized).not.toContain("session_id");
    expect(serialized).not.toContain("transcript_path");
    expect(serialized).not.toContain("cwd");
    expect(serialized).not.toContain("total_cost_usd");
    expect(serialized).not.toContain("model");
    expect(serialized).not.toContain("oauth");
  });

  it("drops unknown rate-limit windows and unknown top-level keys entirely", () => {
    const out = minimizeStatusLine(
      {
        arbitrary_metadata: { a: 1 },
        rate_limits: { five_hour: { used_percentage: 10, resets_at: 1788600000 }, mystery_window: { used_percentage: 99, resets_at: 1 } },
      },
      meta
    );
    expect(Object.keys(out).sort()).toEqual(["capturedAt", "deviceId", "localSequence", "rateLimits", "schemaVersion"]);
    expect(out.rateLimits).toEqual({ five_hour: { used_percentage: 10, resets_at: 1788600000 } });
  });

  it("treats missing rate_limits (pre-first-response) as valid empty", () => {
    const out = minimizeStatusLine({ version: "2.1.260" }, meta);
    expect(out.rateLimits).toBeUndefined();
  });

  it("rejects oversized input without processing it", () => {
    const big: Record<string, unknown> = { version: "x" };
    big.padding = "x".repeat(600 * 1024);
    let threw = false;
    try {
      minimizeStatusLine(big, meta);
    } catch (e) {
      threw = e instanceof MinimizeError;
    }
    expect(threw).toBe(true);
  });

  it("round-trips to usage with correct window ids/percentages/resets", () => {
    const out = minimizeStatusLine(rawStatusLineFixture(), meta);
    const usage = minimizeToUsage(out);
    expect(usage.provider).toBe("claude-code");
    expect(usage.source).toBe("official-local");
    expect(usage.windows.map((w) => w.id)).toEqual(["five_hour", "seven_day", "spend_limit"]);
    expect(usage.windows[0]).toMatchObject({ usedPercent: 23.5 });
    expect(usage.windows[0]?.resetsAt).toBe(new Date(1788600000 * 1000).toISOString());
  });

  it("normalizes only present windows (absent is valid)", () => {
    const out = minimizeStatusLine({ rate_limits: { seven_day: { used_percentage: 41.2, resets_at: 1789000000 } } }, meta);
    const usage = minimizeToUsage(out);
    expect(usage.windows.map((w) => w.id)).toEqual(["seven_day"]);
  });
});

describe("hasProhibitedKey", () => {
  it("detects sensitive keys anywhere in a payload", () => {
    expect(hasProhibitedKey({ cwd: "/x" })).toBe(true);
    expect(hasProhibitedKey({ nested: { sessionId: 1 } })).toBe(true);
    expect(hasProhibitedKey({ transcript_path: "x" })).toBe(true);
    expect(hasProhibitedKey({ token: "x" })).toBe(true);
    expect(hasProhibitedKey({ rate_limits: { five_hour: { used_percentage: 1 } } })).toBe(false);
  });
});

describe("previewRedaction", () => {
  it("reports include/exclude lists without user data", () => {
    const preview = previewRedaction();
    expect(preview.included).toContain("rate_limits.five_hour");
    expect(preview.excluded).toContain("oauth");
    expect(preview.sample).not.toContain("user@");
  });
});
import type { ProviderId } from "./provider.js";
import { PROVIDER_DISPLAY_ORDER } from "./provider.js";
import { fixedClock, toIsoUtc } from "./testing.js";
import type { ProviderUsage, UsageWindow } from "./usage.js";

const ISO = "2026-09-05T12:00:00.000Z";
const clock = fixedClock(ISO);

const window = (
  id: string,
  label: string,
  usedPercent: number,
  resetsAt: string,
  state: UsageWindow["state"] = "normal",
  overrides: Partial<UsageWindow> = {}
): UsageWindow => ({
  id,
  label,
  usedPercent,
  remainingPercent: Math.max(0, 100 - usedPercent),
  used: null,
  limit: null,
  unit: "percent",
  windowSeconds: 18000,
  resetsAt,
  state,
  ...overrides,
});

const openCodeGoWindows: UsageWindow[] = [
  window("rolling", "5 hour", 12, "2026-09-05T18:00:00.000Z"),
  window("weekly", "Weekly", 34, "2026-09-09T12:00:00.000Z"),
  window("monthly", "Monthly", 56, "2026-09-22T12:00:00.000Z"),
];

const codexWindows: UsageWindow[] = [
  window("codex:primary", "5 hour", 25, "2026-09-05T18:00:00.000Z"),
  window("codex:secondary", "Weekly", 40, "2026-09-10T00:00:00.000Z"),
];

const claudeCodeWindows: UsageWindow[] = [
  window("five_hour", "5 hour", 23.5, "2026-09-05T16:00:00.000Z", "normal", {
    unit: "percent",
    windowSeconds: 18000,
  }),
  window("seven_day", "7 day", 41.2, "2026-09-10T00:00:00.000Z"),
];

const copilotWindows: UsageWindow[] = [
  window("premium_interactions", "Premium interactions", 43, "2026-10-01T00:00:00.000Z", "normal", {
    used: 430,
    limit: 1000,
    unit: "requests",
    windowSeconds: 60 * 60 * 24 * 31,
  }),
];

const byProvider: Record<ProviderId, Omit<ProviderUsage, "provider">> = {
  "claude-code": {
    plan: "max",
    windows: claudeCodeWindows,
    fetchedAt: ISO,
    capturedAt: ISO,
    source: "official-local",
    stale: false,
  },
  codex: {
    plan: "plus",
    windows: codexWindows,
    activity: {
      lifetimeTokens: 1234567,
      peakDailyTokens: 45678,
      longestRunningTurnSec: 540,
      currentStreakDays: 8,
      longestStreakDays: 14,
    },
    dailyUsage: [{ startDate: "2026-06-18", tokens: 12345 }],
    fetchedAt: ISO,
    source: "official-api",
    stale: false,
  },
  "opencode-go": {
    plan: "go",
    windows: openCodeGoWindows,
    fetchedAt: ISO,
    source: "source-backed",
    stale: false,
  },
  "github-copilot": {
    plan: "pro",
    windows: copilotWindows,
    fetchedAt: ISO,
    source: "official-api",
    stale: false,
  },
};

/** Deterministic synthetic usage snapshot for a single provider. */
export const providerUsageFixture = (provider: ProviderId): ProviderUsage => ({
  provider,
  ...byProvider[provider],
});

/** Deterministic synthetic snapshot for every provider, in display order. */
export const allProviderUsageFixtures = (): ProviderUsage[] =>
  PROVIDER_DISPLAY_ORDER.map((provider) => providerUsageFixture(provider));

export const isoNow = (): string => toIsoUtc(clock.now());
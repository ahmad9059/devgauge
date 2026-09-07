import type { ProviderConnection, ProviderId, ProviderUsage, UsageWindow } from "@devgauge/contracts";
import { PROVIDER_DISPLAY_ORDER } from "@devgauge/contracts";

/**
 * Deterministic mock repository for the Phase 3 shell. Replaced by the real
 * API client + SQLite cache in Phase 4/9. Values are relative to "now" so
 * countdowns and freshness read as live.
 */

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Deterministic pseudo-random for stable charts.
const lcg = (seed: number): () => number => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAhead = (hours: number): string =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

const makeWindow = (
  id: string,
  label: string,
  usedPercent: number,
  windowSeconds: number,
  resetsInHours: number,
  overrides: Partial<UsageWindow> = {}
): UsageWindow => ({
  id,
  label,
  usedPercent,
  remainingPercent: Math.max(0, 100 - usedPercent),
  used: null,
  limit: null,
  unit: "percent",
  windowSeconds,
  resetsAt: hoursAhead(resetsInHours),
  state: usedPercent >= 100 ? "limited" : usedPercent >= 80 ? "warning" : "normal",
  ...overrides,
});

const windowsByProvider: Record<ProviderId, UsageWindow[]> = {
  "claude-code": [
    makeWindow("five_hour", "5 hour", 23, 5 * 3600, 2),
    makeWindow("seven_day", "7 day", 41, 7 * 86400, 52),
  ],
  codex: [
    makeWindow("codex:primary", "5 hour", 100, 5 * 3600, 0.4, { state: "limited" }),
    makeWindow("codex:secondary", "Weekly", 82, 7 * 86400, 58, { state: "warning" }),
  ],
  "opencode-go": [
    makeWindow("rolling", "5 hour", 12, 5 * 3600, 4),
    makeWindow("weekly", "Weekly", 34, 7 * 86400, 60),
    makeWindow("monthly", "Monthly", 96, 30 * 86400, 280, { state: "warning" }),
  ],
  "github-copilot": [],
};

const usageByProvider: Record<ProviderId, Omit<ProviderUsage, "provider" | "windows">> = {
  "claude-code": { plan: "Max", fetchedAt: minutesAgo(4), source: "official-local", stale: false },
  codex: {
    plan: "Plus",
    fetchedAt: minutesAgo(2),
    source: "official-api",
    stale: false,
    activity: {
      lifetimeTokens: 1234567,
      peakDailyTokens: 45678,
      longestRunningTurnSec: 540,
      currentStreakDays: 8,
      longestStreakDays: 14,
    },
  },
  "opencode-go": { plan: "Go", fetchedAt: minutesAgo(1), source: "source-backed", stale: false },
  "github-copilot": { plan: "Pro", fetchedAt: minutesAgo(9), source: "official-api", stale: true },
};

const connectionByProvider: Record<ProviderId, Omit<ProviderConnection, "provider">> = {
  "claude-code": {
    state: "connected",
    refresh: "succeeded",
    plan: "Max",
    adapterVersion: "companion-0.1.0",
    lastVerifiedAt: minutesAgo(4),
    lastError: null,
    updatedAt: minutesAgo(4),
  },
  codex: {
    state: "connected",
    refresh: "succeeded",
    plan: "Plus",
    adapterVersion: "codex-app-server-0.1.0",
    lastVerifiedAt: minutesAgo(2),
    lastError: null,
    updatedAt: minutesAgo(2),
  },
  "opencode-go": {
    state: "connected",
    refresh: "succeeded",
    plan: "Go",
    adapterVersion: "adapter-0.1.0",
    lastVerifiedAt: minutesAgo(1),
    lastError: null,
    updatedAt: minutesAgo(1),
  },
  "github-copilot": {
    state: "disconnected",
    refresh: "idle",
    plan: null,
    adapterVersion: "sdk-0.1.0",
    lastVerifiedAt: null,
    lastError: null,
    updatedAt: minutesAgo(60),
  },
};

export const providerUsageList = async (): Promise<ProviderUsage[]> => {
  await delay(650);
  return PROVIDER_DISPLAY_ORDER.map((provider) => ({
    provider,
    ...usageByProvider[provider],
    windows: windowsByProvider[provider],
  }));
};

export const providerUsage = async (provider: ProviderId): Promise<ProviderUsage> => {
  await delay(350);
  return {
    provider,
    ...usageByProvider[provider],
    windows: windowsByProvider[provider],
  };
};

export const providerConnections = async (): Promise<ProviderConnection[]> => {
  await delay(500);
  return PROVIDER_DISPLAY_ORDER.map((provider) => ({ provider, ...connectionByProvider[provider] }));
};

export type HistoryRange = "24h" | "7d" | "30d";

const HISTORY_POINTS: Record<HistoryRange, number> = { "24h": 24, "7d": 28, "30d": 30 };

/**
 * Deterministic synthetic history for a provider's primary window, trending
 * toward the current used percentage.
 */
export const historySeries = async (
  provider: ProviderId,
  _windowId: string,
  range: HistoryRange
): Promise<number[]> => {
  await delay(250);
  const points = HISTORY_POINTS[range];
  const rand = lcg(provider.length * 7919 + points);
  const target = windowsByProvider[provider][0]?.usedPercent ?? 40;
  const series: number[] = [];
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const base = target * (0.15 + 0.85 * progress);
    const noise = (rand() - 0.5) * 6;
    series.push(Math.max(2, Math.min(100, Math.round(base + noise))));
  }
  return series;
};
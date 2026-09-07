import type { ProviderId, ProviderUsage, UsageWindow } from "@devgauge/contracts";
import { PROVIDER_DISPLAY_ORDER } from "@devgauge/contracts";

/**
 * Mock provider adapter for Phase 4 (behind FEATURE_MOCK_TRANSPORT).
 * Real adapters replace this in Phases 5-8. Values are relative to "now".
 */

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursAhead = (hours: number): string => new Date(Date.now() + hours * 3_600_000).toISOString();

const window = (
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
  "claude-code": [window("five_hour", "5 hour", 23, 5 * 3600, 2), window("seven_day", "7 day", 41, 7 * 86400, 52)],
  codex: [
    window("codex:primary", "5 hour", 100, 5 * 3600, 0.4, { state: "limited" }),
    window("codex:secondary", "Weekly", 82, 7 * 86400, 58, { state: "warning" }),
  ],
  "opencode-go": [
    window("rolling", "5 hour", 12, 5 * 3600, 4),
    window("weekly", "Weekly", 34, 7 * 86400, 60),
    window("monthly", "Monthly", 96, 30 * 86400, 280, { state: "warning" }),
  ],
  "github-copilot": [window("premium_interactions", "Premium interactions", 43, 31 * 86400, 340, {
    used: 430,
    limit: 1000,
    unit: "requests",
  })],
};

const meta: Record<ProviderId, { plan: string; source: ProviderUsage["source"] }> = {
  "claude-code": { plan: "Max", source: "official-local" },
  codex: { plan: "Plus", source: "official-api" },
  "opencode-go": { plan: "Go", source: "source-backed" },
  "github-copilot": { plan: "Pro", source: "official-api" },
};

export const fetchMockUsage = (provider: ProviderId): ProviderUsage => ({
  provider,
  plan: meta[provider].plan,
  windows: windowsByProvider[provider],
  fetchedAt: minutesAgo(1),
  capturedAt: provider === "claude-code" ? minutesAgo(1) : null,
  source: meta[provider].source,
  stale: false,
});

export const mockProviders = (): readonly ProviderId[] => PROVIDER_DISPLAY_ORDER;
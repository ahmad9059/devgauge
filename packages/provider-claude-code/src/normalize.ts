import type { ProviderUsage, UsageWindow } from "@devgauge/contracts";
import { normalizeWindow, toIsoUtcFromEpochSeconds } from "@devgauge/provider-core";

import type { MinimizedSnapshot } from "./schema.js";
import { RATE_LIMIT_LABELS } from "./schema.js";

export const WINDOW_SECONDS: Record<string, number> = {
  five_hour: 5 * 3600,
  seven_day: 7 * 86400,
};

/**
 * Normalizes a minimized companion snapshot into a ProviderUsage. Each present
 * window is normalized independently; absence (before first Claude API response
 * or after a reset) is valid, not a failure.
 */
export const minimizeToUsage = (snapshot: MinimizedSnapshot): ProviderUsage => {
  const windows: UsageWindow[] = [];
  for (const id of ["five_hour", "seven_day", "spend_limit"] as const) {
    const window = snapshot.rateLimits?.[id];
    if (!window) continue;
    windows.push(
      normalizeWindow({
        id,
        label: RATE_LIMIT_LABELS[id] ?? id,
        usedPercent: window.used_percentage,
        windowSeconds: WINDOW_SECONDS[id] ?? null,
        resetsAt: toIsoUtcFromEpochSeconds(window.resets_at),
      })
    );
  }

  return {
    provider: "claude-code",
    plan: "max",
    windows,
    fetchedAt: snapshot.capturedAt,
    capturedAt: snapshot.capturedAt,
    source: "official-local",
    stale: false,
  };
};
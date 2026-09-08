import type { ActivitySummary, CodexUsageMetadata, ProviderUsage, UsageWindow } from "@devgauge/contracts";
import { normalizeWindow, toIsoUtcFromEpochSeconds } from "@devgauge/provider-core";

import type { RateLimitsResult } from "./schema.js";

const labelFromMinutes = (minutes: number | null | undefined): string => {
  if (minutes == null) return "quota";
  if (minutes % (7 * 24 * 60) === 0) {
    const weeks = minutes / (7 * 24 * 60);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} min`;
};

/** Normalizes the multi-bucket rate-limits response into usage windows. */
export const normalizeRateLimits = (result: RateLimitsResult, now: Date): ProviderUsage => {
  const windows: UsageWindow[] = [];
  const buckets = result.rateLimitsByLimitId ?? { [result.rateLimits.limitId ?? "default"]: result.rateLimits };

  for (const [limitId, bucket] of Object.entries(buckets ?? {})) {
    if (!bucket) continue;
    for (const key of ["primary", "secondary"] as const) {
      const window = bucket[key];
      if (!window) continue;
      const durationMins = window.windowDurationMins ?? null;
      windows.push(
        normalizeWindow({
          id: bucket.limitId ? `${bucket.limitId}:${key}` : `${limitId}:${key}`,
          label: `${labelFromMinutes(durationMins)} (${key})`,
          usedPercent: window.usedPercent ?? null,
          windowSeconds: durationMins ? durationMins * 60 : null,
          resetsAt: toIsoUtcFromEpochSeconds(window.resetsAt),
        })
      );
    }
  }

  return {
    provider: "codex",
    plan: planTypeOf(result),
    windows,
    codex: normalizeCodexMetadata(result),
    fetchedAt: now.toISOString(),
    source: "official-api",
    stale: false,
  };
};

const epochToIso = (value: number | null): string | null =>
  value === null ? null : new Date(value * 1000).toISOString();

export const normalizeCodexMetadata = (result: RateLimitsResult): CodexUsageMetadata => {
  const buckets = result.rateLimitsByLimitId ?? { [result.rateLimits.limitId ?? "default"]: result.rateLimits };
  return {
    limitGroups: Object.entries(buckets).map(([key, bucket]) => ({
      id: bucket.limitId ?? key,
      name: bucket.limitName,
      reachedReason: bucket.rateLimitReachedType,
      creditBalance: bucket.credits?.balance ?? null,
      hasCredits: bucket.credits?.hasCredits ?? null,
      unlimitedCredits: bucket.credits?.unlimited ?? null,
    })),
    resetCredits: result.rateLimitResetCredits === null ? null : {
      availableCount: result.rateLimitResetCredits.availableCount,
      credits: result.rateLimitResetCredits.credits?.map((credit) => ({
        id: credit.id,
        resetType: credit.resetType,
        status: credit.status,
        grantedAt: epochToIso(credit.grantedAt)!,
        expiresAt: epochToIso(credit.expiresAt),
        title: credit.title,
        description: credit.description,
      })) ?? null,
    },
  };
};

const planTypeOf = (result: RateLimitsResult): string | null => {
  if (result.rateLimits?.planType) return result.rateLimits.planType;
  for (const bucket of Object.values(result.rateLimitsByLimitId ?? {})) {
    if (bucket?.planType) return bucket.planType;
  }
  return null;
};

export const normalizeActivitySummary = (summary: {
  lifetimeTokens?: number | null;
  peakDailyTokens?: number | null;
  longestRunningTurnSec?: number | null;
  currentStreakDays?: number | null;
  longestStreakDays?: number | null;
}): ActivitySummary | null => {
  if (!summary) return null;
  if (
    summary.lifetimeTokens == null &&
    summary.peakDailyTokens == null &&
    summary.longestRunningTurnSec == null &&
    summary.currentStreakDays == null &&
    summary.longestStreakDays == null
  ) {
    return null;
  }
  return {
    lifetimeTokens: summary.lifetimeTokens ?? null,
    peakDailyTokens: summary.peakDailyTokens ?? null,
    longestRunningTurnSec: summary.longestRunningTurnSec ?? null,
    currentStreakDays: summary.currentStreakDays ?? null,
    longestStreakDays: summary.longestStreakDays ?? null,
  };
};

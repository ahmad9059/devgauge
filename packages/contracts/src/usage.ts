import { z } from "zod";

import { providerIdSchema } from "./provider.js";

export const USAGE_WINDOW_UNITS = ["requests", "credits", "usd", "tokens", "percent"] as const;
export const usageWindowUnitSchema = z.enum(USAGE_WINDOW_UNITS);

export const usageStateSchema = z.enum(["normal", "warning", "limited", "unknown"]);

export type UsageState = z.infer<typeof usageStateSchema>;

/**
 * A single provider quota window exposed to clients.
 *
 * `usedPercent` / `remainingPercent` are display values, already clamped to 0..100.
 * Upstream numeric originals travel separately in diagnostics and are never
 * exposed through public DTOs.
 */
export const usageWindowSchema = z.object({
  id: z.string(),
  label: z.string(),
  usedPercent: z.number().min(0).max(100).nullable(),
  remainingPercent: z.number().min(0).max(100).nullable(),
  used: z.number().nullable(),
  limit: z.number().nullable(),
  unit: usageWindowUnitSchema.nullable(),
  windowSeconds: z.number().int().positive().nullable(),
  resetsAt: z.string().datetime({ offset: true }).nullable(),
  state: usageStateSchema,
});

export type UsageWindow = z.infer<typeof usageWindowSchema>;

/**
 * Internal diagnostics shape. Preserves upstream numeric originals so
 * out-of-range values are never lost from restricted telemetry.
 */
export const usageWindowDiagnosticsSchema = z.object({
  upstreamUsedPercent: z.number().nullable().optional(),
  upstreamRemainingPercent: z.number().nullable().optional(),
  sourceUsedPercent: z.number().nullable().optional(),
  sourceRemainingPercent: z.number().nullable().optional(),
});

export type UsageWindowDiagnostics = z.infer<typeof usageWindowDiagnosticsSchema>;

/** Codex token-activity summary (nullable upstream). */
export const activitySummarySchema = z.object({
  lifetimeTokens: z.number().int().nonnegative().nullable(),
  peakDailyTokens: z.number().int().nonnegative().nullable(),
  longestRunningTurnSec: z.number().int().nonnegative().nullable(),
  currentStreakDays: z.number().int().nonnegative().nullable(),
  longestStreakDays: z.number().int().nonnegative().nullable(),
});

export type ActivitySummary = z.infer<typeof activitySummarySchema>;

export const dailyUsageBucketSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tokens: z.number().int().nonnegative(),
});

export type DailyUsageBucket = z.infer<typeof dailyUsageBucketSchema>;

export const sourceSchema = z.enum(["official-api", "official-local", "source-backed", "experimental"]);

export type UsageSource = z.infer<typeof sourceSchema>;

/**
 * Normalized usage snapshot for one provider.
 * `stale` is set when the last-known-good data is older than the freshness policy.
 */
export const providerUsageSchema = z.object({
  provider: providerIdSchema,
  plan: z.string().nullable(),
  windows: z.array(usageWindowSchema),
  activity: activitySummarySchema.nullable().optional(),
  dailyUsage: z.array(dailyUsageBucketSchema).nullable().optional(),
  fetchedAt: z.string().datetime({ offset: true }),
  capturedAt: z.string().datetime({ offset: true }).nullable().optional(),
  source: sourceSchema,
  stale: z.boolean(),
});

export type ProviderUsage = z.infer<typeof providerUsageSchema>;
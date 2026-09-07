import type { UsageState, UsageWindow } from "@devgauge/contracts";

/**
 * Clamps a percentage to the display range 0..100.
 * The original value must be preserved in diagnostics for telemetry.
 */
export const clampPercent = (value: number | null | undefined): number | null => {
  if (value == null || Number.isNaN(value)) return null;
  return Math.min(100, Math.max(0, value));
};

/** Remaining percentage, computed only when a used percentage is known. */
export const remainingPercent = (usedPercent: number | null | undefined): number | null => {
  if (usedPercent == null || Number.isNaN(usedPercent)) return null;
  return Math.max(0, 100 - clampPercent(usedPercent)!);
};

/** Converts Unix epoch seconds to an ISO-8601 UTC string. */
export const toIsoUtcFromEpochSeconds = (epochSeconds: number | null | undefined): string | null => {
  if (epochSeconds == null || Number.isNaN(epochSeconds)) return null;
  return new Date(epochSeconds * 1000).toISOString();
};

/** Classifies a window state from a used-percentage diagnostic value. */
export const windowStateFromPercent = (
  usedPercent: number | null | undefined
): UsageState => {
  if (usedPercent == null || Number.isNaN(usedPercent)) return "unknown";
  if (usedPercent >= 100) return "limited";
  if (usedPercent >= 80) return "warning";
  return "normal";
};

export interface NormalizeWindowInput {
  id: string;
  label: string;
  usedPercent: number | null;
  used?: number | null;
  limit?: number | null;
  unit?: UsageWindow["unit"];
  windowSeconds?: number | null;
  resetsAt?: string | null;
}

/**
 * Builds a public usage window with clamped display values.
 * Upstream originals are intentionally NOT retained here; adapters keep
 * them in a separate diagnostics object for restricted telemetry.
 */
export const normalizeWindow = (input: NormalizeWindowInput): UsageWindow => {
  const displayUsed = clampPercent(input.usedPercent);
  return {
    id: input.id,
    label: input.label,
    usedPercent: displayUsed,
    remainingPercent: remainingPercent(displayUsed),
    used: input.used ?? null,
    limit: input.limit ?? null,
    unit: input.unit ?? null,
    windowSeconds: input.windowSeconds ?? null,
    resetsAt: input.resetsAt ?? null,
    state: windowStateFromPercent(input.usedPercent),
  };
};
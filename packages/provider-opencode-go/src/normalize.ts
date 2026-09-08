import { getWindowLabel } from "@devgauge/config";
import type { UsageWindow } from "@devgauge/contracts";
import { normalizeWindow as normalizeProviderWindow } from "@devgauge/provider-core";

import type { OpenCodeGoWindow } from "./schema.js";

export const WINDOW_SECONDS: Record<string, number> = {
  rolling: 5 * 3600,
  weekly: 7 * 86400,
  monthly: 30 * 86400,
};

export interface ProviderUsageWithDiagnostics {
  provider: "opencode-go";
  plan: string | null;
  windows: UsageWindow[];
  fetchedAt: string;
  source: "source-backed";
  stale: boolean;
  /** Original upstream percents, retained for restricted telemetry. */
  diagnostics: Record<string, { upstreamPercent: number | null }>;
}

export interface NormalizedOpenCodeWindow {
  window: UsageWindow;
  upstreamPercent: number | null;
}

/**
 * Normalizes one OpenCode window. `percent` is authoritative used-percent;
 * display values are clamped; upstream originals live in diagnostics.
 * `rate-limited` status forces the window to `limited`.
 */
export const normalizeOpenCodeWindow = (
  id: string,
  window: OpenCodeGoWindow | null | undefined
): NormalizedOpenCodeWindow | null => {
  if (!window) return null;
  const label = getWindowLabel("opencode-go", id);
  const normalized = normalizeProviderWindow({
    id,
    label,
    usedPercent: window.percent,
    windowSeconds: WINDOW_SECONDS[id] ?? null,
    resetsAt: window.resetsAt,
  });
  if (window.status === "rate-limited") {
    normalized.state = "limited";
    normalized.remainingPercent = 0;
  }
  return { window: normalized, upstreamPercent: window.percent };
};
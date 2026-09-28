import { deriveWindow } from '@/domain/usage';
import type { NormalizedUsageResult } from '@/providers/types';

import type { GeminiCliStats } from './schema';

/**
 * Normalizes user-shared Gemini CLI figures. A `session` coverage is always
 * partial: it is one CLI session, not account-wide remaining quota.
 */
export function normalizeGeminiCliStats(
  raw: GeminiCliStats,
  now: string,
): NormalizedUsageResult {
  return {
    fetchedAt: raw.capturedAt || now,
    schemaVersion: 1,
    isPartial: raw.coverage === 'session',
    windows: raw.windows.map((window) =>
      deriveWindow({
        externalKey: `gemini-cli.${window.key}`,
        kind: window.kind,
        label: window.label,
        used: window.used ?? null,
        limit: window.limit ?? null,
        unit: window.unit,
        currencyCode: null,
        periodStartsAt: null,
        periodEndsAt: null,
        resetsAt: window.resetsAt ?? null,
        derivation: 'manual',
      }),
    ),
  };
}

import { deriveWindow } from '@/domain/usage';
import type { NormalizedUsageResult } from '@/providers/types';

import type { OpenCodeGoUsage } from './schema';

/**
 * OpenCode Go parser, isolated from other vendors. Model-specific allowances are
 * preserved as separate windows; no global percentage is fabricated.
 */
export function normalizeOpenCodeGoUsage(
  raw: OpenCodeGoUsage,
  now: string,
): NormalizedUsageResult {
  return {
    fetchedAt: raw.fetchedAt ?? now,
    schemaVersion: 1,
    isPartial: raw.partial ?? false,
    windows: raw.windows.map((window) =>
      deriveWindow({
        externalKey: window.key,
        kind: window.kind,
        label: window.label,
        used: window.used ?? null,
        limit: window.limit ?? null,
        unit: window.unit,
        currencyCode: window.currencyCode ?? null,
        periodStartsAt: null,
        periodEndsAt: null,
        resetsAt: window.resetsAt ?? null,
        derivation: 'provider',
      }),
    ),
  };
}

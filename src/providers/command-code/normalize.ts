import { deriveWindow } from '@/domain/usage';
import type { NormalizedUsageResult } from '@/providers/types';

import type { CommandCodeUsage } from './schema';

/** Command Code parser is isolated so a schema change cannot affect another vendor. */
export function normalizeCommandCodeUsage(
  raw: CommandCodeUsage,
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
        currencyCode: null,
        periodStartsAt: null,
        periodEndsAt: null,
        resetsAt: window.resetsAt ?? null,
        derivation: 'provider',
      }),
    ),
  };
}

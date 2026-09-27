import type { AccountIdentity, UsageWindow } from '@/domain/usage';
import { deriveWindow } from '@/domain/usage';
import type { NormalizedUsageResult } from '@/providers/types';

import type { RawUsage } from './schema';

/** Maps a validated raw payload into the normalized domain result. */
export function normalizeUsage(
  raw: RawUsage,
  fallbackFetchedAt: string,
): NormalizedUsageResult {
  const windows: UsageWindow[] = raw.windows.map((window) =>
    deriveWindow({
      externalKey: window.key,
      kind: window.kind,
      label: window.label,
      used: window.used ?? null,
      limit: window.limit ?? null,
      remaining: window.remaining ?? null,
      unit: window.unit,
      currencyCode: window.currencyCode ?? null,
      periodStartsAt: window.periodStartsAt ?? null,
      periodEndsAt: window.periodEndsAt ?? null,
      resetsAt: window.resetsAt ?? null,
      derivation: window.derivation ?? 'provider',
    }),
  );

  const identity: AccountIdentity | undefined = raw.account
    ? {
        externalId: raw.account.externalId ?? null,
        displayName: raw.account.displayName ?? null,
        accountHint: raw.account.accountHint ?? null,
        scope: raw.account.scope ?? 'personal',
      }
    : undefined;

  return {
    ...(identity ? { identity } : {}),
    fetchedAt: raw.fetchedAt ?? fallbackFetchedAt,
    schemaVersion: raw.schemaVersion,
    isPartial: raw.partial ?? false,
    windows,
    ...(raw.requestId ? { safeRequestId: raw.requestId } : {}),
  };
}

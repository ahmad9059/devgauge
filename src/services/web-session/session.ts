import type { ProviderId } from '@/domain/providers';
import type { UsageWindow } from '@/domain/usage';
import type { Database } from '@/storage/database';
import { upsertConnection } from '@/storage/repositories/connections';
import { saveRefresh } from '@/storage/repositories/usage';
import type { UsageSnapshotRecord, UsageWindowRecord } from '@/storage/types';

export type SaveSessionInput = {
  db: Database;
  providerId: ProviderId;
  displayName: string;
  windows: UsageWindow[];
  /** When the captured data was fetched (from the provider payload). */
  fetchedAt: string;
  now: Date;
  nextId: () => string;
  /** Defaults to a cookie-based web session. */
  authMode?: 'web-session' | 'api-key';
  credentialRef?: string | null;
};

export type SaveSessionResult = {
  connectionId: string;
  windowCount: number;
};

/**
 * Persists a website-session snapshot: a web-session connection plus the
 * captured, normalized windows, written atomically. No credential material is
 * stored (the session lives in the WebView cookie store).
 */
export async function saveSessionSnapshot(
  input: SaveSessionInput,
): Promise<SaveSessionResult> {
  const connectionId = `session-${input.providerId}`;
  const nowIso = input.now.toISOString();

  await upsertConnection(input.db, {
    id: connectionId,
    providerId: input.providerId,
    accountScope: 'personal',
    externalAccountId: null,
    canonicalAccountKey: `session:${input.providerId}`,
    displayName: input.displayName,
    accountHint: null,
    authMode: input.authMode ?? 'web-session',
    credentialRef: input.credentialRef ?? null,
    status: 'connected',
    connectedAt: nowIso,
    disconnectedAt: null,
    lastSuccessAt: input.fetchedAt,
    lastAttemptAt: nowIso,
    nextAllowedRefreshAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const snapshotId = input.nextId();
  const snapshot: UsageSnapshotRecord = {
    id: snapshotId,
    connectionId,
    fetchedAt: input.fetchedAt,
    source: 'live',
    providerSchemaVersion: 1,
    isPartial: false,
    responseFingerprint: null,
    createdAt: nowIso,
  };
  const windows: UsageWindowRecord[] = input.windows.map((window) => ({
    id: input.nextId(),
    snapshotId,
    externalKey: window.externalKey,
    kind: window.kind,
    label: window.label,
    usedDecimal: window.used,
    limitDecimal: window.limit,
    remainingDecimal: window.remaining,
    utilization: window.utilization,
    unit: window.unit,
    currencyCode: window.currencyCode,
    periodStartsAt: window.periodStartsAt,
    periodEndsAt: window.periodEndsAt,
    resetsAt: window.resetsAt,
    derivation: window.derivation,
  }));

  await saveRefresh(input.db, {
    connection: {
      id: connectionId,
      status: 'connected',
      lastSuccessAt: input.fetchedAt,
      lastAttemptAt: nowIso,
      nextAllowedRefreshAt: null,
      updatedAt: nowIso,
    },
    attempt: {
      id: input.nextId(),
      connectionId,
      startedAt: nowIso,
      completedAt: nowIso,
      trigger: 'manual',
      outcome: 'success',
      httpStatus: 200,
      errorCode: null,
      retryAfterAt: null,
      requestId: null,
      durationMs: 0,
      safeDetail: null,
    },
    snapshot: { snapshot, windows },
  });

  return { connectionId, windowCount: windows.length };
}

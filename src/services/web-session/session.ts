import { withWriteTransaction } from '@/storage/write-transaction';
import { normalizeResetTime } from '@/domain/reset-time';
import type { ProviderId } from '@/domain/providers';
import type { UsageWindow } from '@/domain/usage';
import type { Database } from '@/storage/database';
import { upsertConnectionInTransaction } from '@/storage/repositories/connections';
import { saveRefreshInTransaction } from '@/storage/repositories/usage';
import type {
  RefreshTrigger,
  UsageSnapshotRecord,
  UsageWindowRecord,
} from '@/storage/types';

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
  authMode?: 'web-session' | 'api-key' | 'oauth-pkce';
  credentialRef?: string | null;
  trigger?: RefreshTrigger;
  /** Absent means the capture start was not measured; duration stays unknown. */
  startedAt?: Date;
};

export type SaveSessionResult = {
  connectionId: string;
  windowCount: number;
};

const pendingSaves = new WeakMap<Database, Promise<unknown>>();

/** Network capture is parallel; short writes on the shared SQLite handle queue. */
export function saveSessionSnapshot(
  input: SaveSessionInput,
): Promise<SaveSessionResult> {
  const previous = pendingSaves.get(input.db) ?? Promise.resolve();
  const result = previous.then(
    () => persistSessionSnapshot(input),
    () => persistSessionSnapshot(input),
  );
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  pendingSaves.set(input.db, tail);
  void tail.then(() => {
    if (pendingSaves.get(input.db) === tail) pendingSaves.delete(input.db);
  });
  return result;
}

/**
 * Persists a website-session snapshot: a web-session connection plus the
 * captured, normalized windows, written atomically. No credential material is
 * stored (the session lives in the WebView cookie store).
 */
async function persistSessionSnapshot(
  input: SaveSessionInput,
): Promise<SaveSessionResult> {
  const connectionId = `session-${input.providerId}`;
  const nowIso = input.now.toISOString();

  await withWriteTransaction(input.db, async (tx) => {
    await upsertConnectionInTransaction(tx, {
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
      isPartial: input.windows.some(
        (window) =>
          window.used === null ||
          window.limit === null ||
          window.resetsAt === null,
      ),
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
      resetsAt: normalizeResetTime(window.resetsAt, new Date(input.fetchedAt)),
      resetsSourceText: window.resetsSourceText ?? window.resetsAt,
      derivation: window.derivation,
    }));

    await saveRefreshInTransaction(tx, {
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
        startedAt: input.startedAt?.toISOString() ?? nowIso,
        completedAt: nowIso,
        trigger: input.trigger ?? 'manual',
        outcome: 'success',
        httpStatus: 200,
        errorCode: null,
        retryAfterAt: null,
        requestId: null,
        durationMs: input.startedAt
          ? Math.max(0, input.now.getTime() - input.startedAt.getTime())
          : null,
        safeDetail: null,
      },
      snapshot: { snapshot, windows },
    });
  });
  return { connectionId, windowCount: input.windows.length };
}

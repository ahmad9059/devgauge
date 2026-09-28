import {
  isTransientCode,
  toProviderError,
  type ProviderErrorCode,
} from '@/domain/errors';
import type { UsageWindow } from '@/domain/usage';
import type { ProviderRegistry } from '@/providers/registry';
import type {
  NormalizedUsageResult,
  ProviderCredential,
} from '@/providers/types';
import type { CapabilityGate } from '@/services/capabilities/manifest';
import { computeBackoff } from '@/services/network/backoff';
import type { HttpClient } from '@/services/network/client';
import type { Database } from '@/storage/database';
import { getConnection } from '@/storage/repositories/connections';
import { saveRefresh } from '@/storage/repositories/usage';
import type { SecureVault } from '@/storage/secure-vault';
import type {
  ConnectionStatus,
  ProviderConnection,
  RefreshTrigger,
  UsageSnapshotRecord,
  UsageWindowRecord,
} from '@/storage/types';

export type RefreshOutcome =
  | {
      status: 'success';
      connectionId: string;
      snapshotId: string;
      windowCount: number;
    }
  | { status: 'auth-expired'; connectionId: string; code: ProviderErrorCode }
  | { status: 'schema-changed'; connectionId: string; code: ProviderErrorCode }
  | { status: 'rate-limited'; connectionId: string; retryAt: string }
  | {
      status: 'transient-failure';
      connectionId: string;
      code: ProviderErrorCode;
      retryAt: string | null;
    }
  | { status: 'cancelled'; connectionId: string }
  | { status: 'skipped'; connectionId: string; reason: string };

export type RefreshEngineDependencies = {
  db: Database;
  vault: SecureVault;
  registry: ProviderRegistry;
  client: HttpClient;
  /** Required: callers choose the random source (SecureStore/expo-crypto). */
  nextId: () => string;
  capabilityGate?: CapabilityGate;
  clock?: () => Date;
  concurrency?: number;
  backoff?: typeof computeBackoff;
};

export type RefreshEngine = {
  refresh(
    connectionId: string,
    trigger?: RefreshTrigger,
  ): Promise<RefreshOutcome>;
  refreshMany(
    connectionIds: string[],
    trigger?: RefreshTrigger,
  ): Promise<RefreshOutcome[]>;
  cancel(connectionId: string): void;
  activeCount(): number;
};

function createSemaphore(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('concurrency must be an integer >= 1');
  }
  let active = 0;
  const waiters: Array<() => void> = [];
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= limit) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
      active += 1;
      try {
        return await task();
      } finally {
        active -= 1;
        const next = waiters.shift();
        if (next) next();
      }
    },
  };
}

async function loadCredential(
  vault: SecureVault,
  connection: ProviderConnection,
): Promise<ProviderCredential> {
  if (!connection.credentialRef) return { kind: 'none' };
  const record = await vault.load(connection.credentialRef);
  if (!record) return { kind: 'none' };
  if (record.kind === 'api-key' && record.apiKey) {
    return { kind: 'api-key', apiKey: record.apiKey };
  }
  if (record.kind === 'oauth' && record.accessToken) {
    return {
      kind: 'oauth',
      accessToken: record.accessToken,
      ...(record.refreshToken ? { refreshToken: record.refreshToken } : {}),
      ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
    };
  }
  return { kind: 'none' };
}

function toStorage(
  connectionId: string,
  normalized: NormalizedUsageResult,
  nextId: () => string,
): { snapshot: UsageSnapshotRecord; windows: UsageWindowRecord[] } {
  const snapshotId = nextId();
  const snapshot: UsageSnapshotRecord = {
    id: snapshotId,
    connectionId,
    fetchedAt: normalized.fetchedAt,
    source: 'live',
    providerSchemaVersion: normalized.schemaVersion,
    isPartial: normalized.isPartial,
    responseFingerprint: null,
    createdAt: normalized.fetchedAt,
  };
  const windows: UsageWindowRecord[] = normalized.windows.map(
    (window: UsageWindow): UsageWindowRecord => ({
      id: nextId(),
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
    }),
  );
  return { snapshot, windows };
}

export function createRefreshEngine(
  dependencies: RefreshEngineDependencies,
): RefreshEngine {
  const {
    db,
    vault,
    registry,
    client,
    nextId,
    capabilityGate,
    clock = () => new Date(),
    concurrency = 2,
    backoff = computeBackoff,
  } = dependencies;

  const semaphore = createSemaphore(concurrency);
  const inFlight = new Map<string, Promise<RefreshOutcome>>();
  const controllers = new Map<string, AbortController>();
  const consecutiveFailures = new Map<string, number>();

  async function persistAttempt(
    connectionId: string,
    trigger: RefreshTrigger,
    startedAt: string,
    code: ProviderErrorCode | null,
    httpStatus: number | null,
    retryAfterAt: string | null,
    safeDetail: string | null,
    connection: ProviderConnection,
    status: ConnectionStatus,
    nextAllowedRefreshAt: string | null,
    lastSuccessAt: string | null,
  ): Promise<void> {
    const completedAt = clock().toISOString();
    await saveRefresh(db, {
      connection: {
        id: connectionId,
        status,
        lastSuccessAt,
        lastAttemptAt: startedAt,
        nextAllowedRefreshAt,
        updatedAt: completedAt,
      },
      attempt: {
        id: nextId(),
        connectionId,
        startedAt,
        completedAt,
        trigger,
        outcome: code === null ? 'success' : 'failure',
        httpStatus,
        errorCode: code,
        retryAfterAt,
        requestId: null,
        durationMs: Math.max(
          0,
          Date.parse(completedAt) - Date.parse(startedAt),
        ),
        safeDetail,
      },
    });
  }

  async function runRefresh(
    connectionId: string,
    trigger: RefreshTrigger,
    signal: AbortSignal,
  ): Promise<RefreshOutcome> {
    const connection = await getConnection(db, connectionId);
    if (!connection) {
      return { status: 'skipped', connectionId, reason: 'unknown-connection' };
    }

    const descriptor = registry.descriptor(connection.providerId);
    const adapter = registry.adapter(connection.providerId);

    if (
      descriptor.requiresCapabilityManifest &&
      capabilityGate &&
      !capabilityGate.isLiveAllowed(connection.providerId)
    ) {
      await persistAttempt(
        connectionId,
        trigger,
        clock().toISOString(),
        'capability_disabled',
        null,
        null,
        null,
        connection,
        connection.status,
        connection.nextAllowedRefreshAt,
        connection.lastSuccessAt,
      );
      return { status: 'skipped', connectionId, reason: 'capability-disabled' };
    }

    if (typeof adapter?.fetchUsage !== 'function') {
      return { status: 'skipped', connectionId, reason: 'no-live-adapter' };
    }

    // Release gate: a connector can be implemented but not yet enabled (for
    // example GitHub Copilot before its feasibility spikes pass).
    if (!descriptor.capabilities.liveUsage) {
      await persistAttempt(
        connectionId,
        trigger,
        clock().toISOString(),
        'capability_disabled',
        null,
        null,
        null,
        connection,
        connection.status,
        connection.nextAllowedRefreshAt,
        connection.lastSuccessAt,
      );
      return { status: 'skipped', connectionId, reason: 'release-disabled' };
    }

    const startedAt = clock().toISOString();
    if (
      trigger !== 'manual' &&
      connection.nextAllowedRefreshAt !== null &&
      Date.parse(connection.nextAllowedRefreshAt) > clock().getTime()
    ) {
      return { status: 'skipped', connectionId, reason: 'not-yet-due' };
    }

    const credential = await loadCredential(vault, connection);
    const requestStartedAt = clock().toISOString();

    try {
      if (signal.aborted) return { status: 'cancelled', connectionId };
      const normalized = await adapter.fetchUsage({
        connection,
        credential,
        now: clock(),
        signal,
        client,
      });
      if (signal.aborted) {
        await persistAttempt(
          connectionId,
          trigger,
          startedAt,
          null,
          null,
          null,
          null,
          connection,
          connection.status,
          connection.nextAllowedRefreshAt,
          connection.lastSuccessAt,
        );
        return { status: 'cancelled', connectionId };
      }

      const { snapshot, windows } = toStorage(connectionId, normalized, nextId);
      const nextAllowed =
        descriptor.minimumRefreshIntervalSeconds > 0
          ? new Date(
              clock().getTime() +
                descriptor.minimumRefreshIntervalSeconds * 1000,
            ).toISOString()
          : null;

      await saveRefresh(db, {
        connection: {
          id: connectionId,
          status: 'connected',
          lastSuccessAt: normalized.fetchedAt,
          lastAttemptAt: startedAt,
          nextAllowedRefreshAt: nextAllowed,
          updatedAt: clock().toISOString(),
        },
        attempt: {
          id: nextId(),
          connectionId,
          startedAt,
          completedAt: clock().toISOString(),
          trigger,
          outcome: 'success',
          httpStatus: 200,
          errorCode: null,
          retryAfterAt: null,
          requestId: normalized.safeRequestId ?? null,
          durationMs: Math.max(
            0,
            clock().getTime() - Date.parse(requestStartedAt),
          ),
          safeDetail: null,
        },
        snapshot: { snapshot, windows },
      });

      consecutiveFailures.delete(connectionId);
      return {
        status: 'success',
        connectionId,
        snapshotId: snapshot.id,
        windowCount: windows.length,
      };
    } catch (error) {
      if (signal.aborted) {
        await persistAttempt(
          connectionId,
          trigger,
          startedAt,
          null,
          null,
          null,
          null,
          connection,
          connection.status,
          connection.nextAllowedRefreshAt,
          connection.lastSuccessAt,
        );
        return { status: 'cancelled', connectionId };
      }

      const providerError = toProviderError(error);
      const code = providerError.code;
      const failedAt = clock();

      let status: ConnectionStatus = connection.status;
      let nextAllowedRefreshAt: string | null = null;
      let retryAt: string | null = null;

      if (code === 'rate_limited') {
        const retryMs = providerError.retryAfterMs ?? 0;
        retryAt = new Date(failedAt.getTime() + retryMs).toISOString();
        nextAllowedRefreshAt = retryAt;
      } else if (code === 'unauthorized' || code === 'forbidden') {
        status = 'expired';
      } else if (
        code === 'schema_changed' ||
        code === 'capability_disabled' ||
        code === 'unsupported_account'
      ) {
        status = 'error';
      } else if (isTransientCode(code)) {
        const attempt = (consecutiveFailures.get(connectionId) ?? 0) + 1;
        consecutiveFailures.set(connectionId, attempt);
        retryAt = new Date(failedAt.getTime() + backoff(attempt)).toISOString();
        nextAllowedRefreshAt = retryAt;
        if (!connection.lastSuccessAt) status = 'error';
      }

      await persistAttempt(
        connectionId,
        trigger,
        startedAt,
        code,
        providerError.httpStatus,
        retryAt,
        providerError.safeDetail,
        connection,
        status,
        nextAllowedRefreshAt,
        connection.lastSuccessAt,
      );

      switch (code) {
        case 'unauthorized':
        case 'forbidden':
          return { status: 'auth-expired', connectionId, code };
        case 'rate_limited':
          return {
            status: 'rate-limited',
            connectionId,
            retryAt: retryAt as string,
          };
        case 'schema_changed':
        case 'unsupported_account':
          return { status: 'schema-changed', connectionId, code };
        default:
          return {
            status: 'transient-failure',
            connectionId,
            code,
            retryAt,
          };
      }
    }
  }

  function refresh(
    connectionId: string,
    trigger: RefreshTrigger = 'manual',
  ): Promise<RefreshOutcome> {
    const existing = inFlight.get(connectionId);
    if (existing) return existing;

    const controller = new AbortController();
    controllers.set(connectionId, controller);
    const promise = semaphore
      .run(() => runRefresh(connectionId, trigger, controller.signal))
      .finally(() => {
        inFlight.delete(connectionId);
        controllers.delete(connectionId);
      });
    inFlight.set(connectionId, promise);
    return promise;
  }

  return {
    refresh,
    async refreshMany(connectionIds, trigger = 'manual') {
      const settled = await Promise.allSettled(
        connectionIds.map((id) => refresh(id, trigger)),
      );
      return settled.map((result, index) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              status: 'transient-failure',
              connectionId: connectionIds[index],
              code: 'unknown',
              retryAt: null,
            },
      );
    },
    cancel(connectionId) {
      controllers.get(connectionId)?.abort();
    },
    activeCount() {
      return inFlight.size;
    },
  };
}

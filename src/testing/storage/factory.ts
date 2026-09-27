import type {
  ManualResetEntry,
  NotificationRuleRecord,
  ProviderConnection,
  RefreshAttemptRecord,
  ScheduledNotificationRecord,
  UsageSnapshotRecord,
  UsageWindowRecord,
} from '@/storage/types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${String(counter).padStart(4, '0')}`;
}

export function makeConnection(
  overrides: Partial<ProviderConnection> = {},
): ProviderConnection {
  const id = overrides.id ?? nextId('conn');
  return {
    id,
    providerId: 'claude',
    accountScope: 'personal',
    externalAccountId: null,
    canonicalAccountKey: `claude:${id}`,
    displayName: 'Claude Max',
    accountHint: 'u***@example.com',
    authMode: 'web-session',
    credentialRef: `provider.claude.connection.${id}.oauth`,
    status: 'connected',
    connectedAt: '2026-09-01T00:00:00.000Z',
    disconnectedAt: null,
    lastSuccessAt: null,
    lastAttemptAt: null,
    nextAllowedRefreshAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeSnapshot(
  connectionId: string,
  overrides: Partial<UsageSnapshotRecord> = {},
): UsageSnapshotRecord {
  const id = overrides.id ?? nextId('snap');
  return {
    id,
    connectionId,
    fetchedAt: '2026-09-01T00:00:00.000Z',
    source: 'live',
    providerSchemaVersion: 1,
    isPartial: false,
    responseFingerprint: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeWindow(
  snapshotId: string,
  overrides: Partial<UsageWindowRecord> = {},
): UsageWindowRecord {
  return {
    id: overrides.id ?? nextId('win'),
    snapshotId,
    externalKey: overrides.externalKey ?? nextId('key'),
    kind: 'rolling',
    label: '5-hour window',
    usedDecimal: '42',
    limitDecimal: '100',
    remainingDecimal: '58',
    utilization: 0.42,
    unit: 'percent',
    currencyCode: null,
    periodStartsAt: null,
    periodEndsAt: null,
    resetsAt: '2026-09-01T05:00:00.000Z',
    derivation: 'provider',
    ...overrides,
  };
}

export function makeAttempt(
  connectionId: string,
  overrides: Partial<RefreshAttemptRecord> = {},
): RefreshAttemptRecord {
  return {
    id: overrides.id ?? nextId('attempt'),
    connectionId,
    startedAt: '2026-09-01T00:00:00.000Z',
    completedAt: '2026-09-01T00:00:01.000Z',
    trigger: 'manual',
    outcome: 'success',
    httpStatus: 200,
    errorCode: null,
    retryAfterAt: null,
    requestId: null,
    durationMs: 1000,
    safeDetail: null,
    ...overrides,
  };
}

export function makeRule(
  overrides: Partial<NotificationRuleRecord> = {},
): NotificationRuleRecord {
  return {
    id: overrides.id ?? nextId('rule'),
    providerId: 'claude',
    ruleType: 'threshold',
    enabled: true,
    threshold: 0.8,
    leadMinutes: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeScheduled(
  ruleId: string,
  overrides: Partial<ScheduledNotificationRecord> = {},
): ScheduledNotificationRecord {
  const id = overrides.id ?? nextId('sched');
  return {
    id,
    ruleId,
    connectionId: null,
    windowExternalKey: null,
    nativeIdentifier: `native-${id}`,
    scheduledFor: '2026-09-01T05:00:00.000Z',
    status: 'scheduled',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeManualReset(
  overrides: Partial<ManualResetEntry> = {},
): ManualResetEntry {
  return {
    id: overrides.id ?? nextId('reset'),
    providerId: 'claude',
    label: 'Weekly reset',
    resetsAt: '2026-09-08T00:00:00.000Z',
    sourceNote: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

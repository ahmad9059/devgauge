import type { ProviderId } from '@/domain/providers';

export const ACCOUNT_SCOPES = [
  'personal',
  'organization',
  'workspace',
] as const;
export type AccountScope = (typeof ACCOUNT_SCOPES)[number];

export const AUTH_MODES = [
  'oauth-pkce',
  'api-key',
  'web-session',
  'manual-import',
  'manual',
] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const CONNECTION_STATUSES = [
  'disconnected',
  'connected',
  'expired',
  'disabled',
  'error',
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export type ProviderConnection = {
  id: string;
  providerId: ProviderId;
  accountScope: AccountScope;
  externalAccountId: string | null;
  canonicalAccountKey: string;
  displayName: string | null;
  accountHint: string | null;
  authMode: AuthMode;
  credentialRef: string | null;
  status: ConnectionStatus;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  nextAllowedRefreshAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const WINDOW_KINDS = [
  'rolling',
  'daily',
  'weekly',
  'monthly',
  'billing',
] as const;
export type WindowKind = (typeof WINDOW_KINDS)[number];

export const USAGE_UNITS = [
  'percent',
  'requests',
  'credits',
  'tokens',
  'currency',
] as const;
export type StorageUsageUnit = (typeof USAGE_UNITS)[number];

export const DERIVATIONS = ['provider', 'documented-rule', 'manual'] as const;
export type Derivation = (typeof DERIVATIONS)[number];

export type UsageSnapshotRecord = {
  id: string;
  connectionId: string;
  fetchedAt: string;
  source: 'live' | 'manual';
  providerSchemaVersion: number;
  isPartial: boolean;
  responseFingerprint: string | null;
  createdAt: string;
};

export type UsageWindowRecord = {
  id: string;
  snapshotId: string;
  externalKey: string;
  kind: WindowKind;
  label: string;
  usedDecimal: string | null;
  limitDecimal: string | null;
  remainingDecimal: string | null;
  utilization: number | null;
  unit: StorageUsageUnit;
  currencyCode: string | null;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  resetsAt: string | null;
  derivation: Derivation;
};

export type SnapshotWithWindows = UsageSnapshotRecord & {
  windows: UsageWindowRecord[];
};

export const REFRESH_TRIGGERS = [
  'startup',
  'foreground',
  'manual',
  'retry',
] as const;
export type RefreshTrigger = (typeof REFRESH_TRIGGERS)[number];

export const REFRESH_OUTCOMES = [
  'running',
  'success',
  'failure',
  'cancelled',
  'skipped',
] as const;
export type RefreshOutcome = (typeof REFRESH_OUTCOMES)[number];

export type RefreshAttemptRecord = {
  id: string;
  connectionId: string;
  startedAt: string;
  completedAt: string | null;
  trigger: RefreshTrigger;
  outcome: RefreshOutcome;
  httpStatus: number | null;
  errorCode: string | null;
  retryAfterAt: string | null;
  requestId: string | null;
  durationMs: number | null;
  safeDetail: string | null;
};

export type NotificationRuleRecord = {
  id: string;
  providerId: ProviderId | null;
  ruleType: 'threshold' | 'reset-reminder';
  enabled: boolean;
  threshold: number | null;
  leadMinutes: number | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SCHEDULED_STATUSES = [
  'scheduled',
  'delivered',
  'cancelled',
  'superseded',
] as const;
export type ScheduledStatus = (typeof SCHEDULED_STATUSES)[number];

export type ScheduledNotificationRecord = {
  id: string;
  ruleId: string;
  connectionId: string | null;
  windowExternalKey: string | null;
  nativeIdentifier: string;
  scheduledFor: string;
  status: ScheduledStatus;
  createdAt: string;
  updatedAt: string;
};

export type ManualResetEntry = {
  id: string;
  providerId: 'claude' | 'codex';
  label: string;
  resetsAt: string;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CliStatsImport = {
  snapshotId: string;
  cliVersion: string | null;
  capturedAt: string;
  coverage: 'session' | 'reported-quota';
  createdAt: string;
};

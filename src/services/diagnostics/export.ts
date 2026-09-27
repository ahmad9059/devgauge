import type { Database } from '@/storage/database';
import { listConnections } from '@/storage/repositories/connections';
import { listManualResetEntries } from '@/storage/repositories/manual-reset';
import { listNotificationRules } from '@/storage/repositories/notifications';
import { listSettings } from '@/storage/repositories/settings';

/**
 * Redaction applied to every diagnostics export. Defense in depth: it masks
 * sensitive field names and scrubs credential-shaped substrings, so an
 * accidental secret in free text never leaves the device.
 */
const SENSITIVE_KEY =
  /(authorization|cookie|token|api[_-]?key|secret|password|verifier|session)/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bsk-[A-Za-z0-9]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g,
];

// Non-secret keys that merely contain a sensitive token as a substring.
const SAFE_KEYS = new Set([
  'errorCode',
  'error_code',
  'currencyCode',
  'currency_code',
]);

export function redactString(value: string): string {
  let result = value.replace(EMAIL, '[redacted-email]');
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[redacted]');
  }
  return result;
}

export function redactValue(key: string, value: unknown): unknown {
  if (!SAFE_KEYS.has(key) && SENSITIVE_KEY.test(key)) return '[redacted]';
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([childKey, child]) => [childKey, redactValue(childKey, child)],
      ),
    );
  }
  return value;
}

export type DiagnosticsExport = {
  formatVersion: 1;
  generatedAt: string;
  database: { userVersion: number };
  counts: {
    connections: number;
    snapshots: number;
    windows: number;
    attempts: number;
    rules: number;
    scheduled: number;
    manualResets: number;
  };
  connections: Array<{
    id: string;
    providerId: string;
    accountScope: string;
    status: string;
    authMode: string;
    accountHint: string | null;
    hasCredential: boolean;
    lastSuccessAt: string | null;
  }>;
  recentAttempts: Array<{
    connectionId: string;
    outcome: string;
    errorCode: string | null;
    httpStatus: number | null;
    durationMs: number | null;
    safeDetail: string | null;
  }>;
  settings: Array<{ key: string; value: unknown }>;
  notificationRules: Array<{
    id: string;
    providerId: string | null;
    ruleType: string;
    enabled: boolean;
  }>;
  manualResets: Array<{
    id: string;
    providerId: string;
    label: string;
    resetsAt: string;
  }>;
};

const COUNT_TABLES = [
  'provider_connections',
  'usage_snapshots',
  'usage_windows',
  'refresh_attempts',
  'notification_rules',
  'scheduled_notifications',
  'manual_reset_entries',
] as const;

async function countRows(db: Database, table: string): Promise<number> {
  // Table name is from a closed constant list, never user input.
  const row = await db.first<{ c: number }>(
    `SELECT COUNT(*) AS c FROM ${table}`,
  );
  return row?.c ?? 0;
}

/**
 * Builds a redacted, non-secret view of local state. It never reads raw token
 * material; only opaque credential presence is reported.
 */
export async function buildDiagnosticsExport(
  db: Database,
  options: { generatedAt: string },
): Promise<DiagnosticsExport> {
  const userVersion = await db.userVersion();
  const counts = {
    connections: 0,
    snapshots: 0,
    windows: 0,
    attempts: 0,
    rules: 0,
    scheduled: 0,
    manualResets: 0,
  };
  const [
    connections,
    snapshots,
    windows,
    attempts,
    rules,
    scheduled,
    manualResets,
  ] = await Promise.all(COUNT_TABLES.map((table) => countRows(db, table)));
  Object.assign(counts, {
    connections,
    snapshots,
    windows,
    attempts,
    rules,
    scheduled,
    manualResets,
  });

  const connectionRows = await listConnections(db);
  const attemptRows = await db.all<{
    connection_id: string;
    outcome: string;
    error_code: string | null;
    http_status: number | null;
    duration_ms: number | null;
    safe_detail: string | null;
  }>(
    `SELECT connection_id, outcome, error_code, http_status, duration_ms,
            safe_detail FROM refresh_attempts
     ORDER BY started_at DESC LIMIT 50`,
  );
  const settingRows = await listSettings(db);
  const ruleRows = await listNotificationRules(db);
  const resetRows = await listManualResetEntries(db);

  const view: DiagnosticsExport = {
    formatVersion: 1,
    generatedAt: options.generatedAt,
    database: { userVersion },
    counts,
    connections: connectionRows.map((connection) => ({
      id: connection.id,
      providerId: connection.providerId,
      accountScope: connection.accountScope,
      status: connection.status,
      authMode: connection.authMode,
      accountHint: connection.accountHint,
      hasCredential: connection.credentialRef !== null,
      lastSuccessAt: connection.lastSuccessAt,
    })),
    recentAttempts: attemptRows.map((row) => ({
      connectionId: row.connection_id,
      outcome: row.outcome,
      errorCode: row.error_code,
      httpStatus: row.http_status,
      durationMs: row.duration_ms,
      safeDetail: row.safe_detail,
    })),
    settings: settingRows,
    notificationRules: ruleRows.map((rule) => ({
      id: rule.id,
      providerId: rule.providerId,
      ruleType: rule.ruleType,
      enabled: rule.enabled,
    })),
    manualResets: resetRows.map((entry) => ({
      id: entry.id,
      providerId: entry.providerId,
      label: entry.label,
      resetsAt: entry.resetsAt,
    })),
  };

  return redactValue('export', view) as DiagnosticsExport;
}

export function serializeDiagnosticsExport(
  diagnostics: DiagnosticsExport,
): string {
  return JSON.stringify(redactValue('export', diagnostics), null, 2);
}

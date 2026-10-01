import { withWriteTransaction } from '@/storage/write-transaction';
import type { Database } from '@/storage/database';
import type { SqlDriver } from '@/storage/sqlite-driver';
import type {
  CliStatsImport,
  ConnectionStatus,
  RefreshAttemptRecord,
  SnapshotWithWindows,
  UsageSnapshotRecord,
  UsageWindowRecord,
} from '@/storage/types';

type SnapshotRow = {
  id: string;
  connection_id: string;
  fetched_at: string;
  source: string;
  provider_schema_version: number;
  is_partial: number;
  response_fingerprint: string | null;
  created_at: string;
};

type WindowRow = {
  id: string;
  snapshot_id: string;
  external_key: string;
  kind: string;
  label: string;
  used_decimal: string | null;
  limit_decimal: string | null;
  remaining_decimal: string | null;
  utilization: number | null;
  unit: string;
  currency_code: string | null;
  period_starts_at: string | null;
  period_ends_at: string | null;
  resets_at: string | null;
  resets_source_text: string | null;
  derivation: string;
};

function toSnapshot(row: SnapshotRow): UsageSnapshotRecord {
  return {
    id: row.id,
    connectionId: row.connection_id,
    fetchedAt: row.fetched_at,
    source: row.source as UsageSnapshotRecord['source'],
    providerSchemaVersion: row.provider_schema_version,
    isPartial: row.is_partial === 1,
    responseFingerprint: row.response_fingerprint,
    createdAt: row.created_at,
  };
}

function toWindow(row: WindowRow): UsageWindowRecord {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    externalKey: row.external_key,
    kind: row.kind as UsageWindowRecord['kind'],
    label: row.label,
    usedDecimal: row.used_decimal,
    limitDecimal: row.limit_decimal,
    remainingDecimal: row.remaining_decimal,
    utilization: row.utilization,
    unit: row.unit as UsageWindowRecord['unit'],
    currencyCode: row.currency_code,
    periodStartsAt: row.period_starts_at,
    periodEndsAt: row.period_ends_at,
    resetsAt: row.resets_at,
    resetsSourceText: row.resets_source_text,
    derivation: row.derivation as UsageWindowRecord['derivation'],
  };
}

const SNAPSHOT_COLUMNS = `id, connection_id, fetched_at, source,
  provider_schema_version, is_partial, response_fingerprint, created_at`;
const WINDOW_COLUMNS = `id, snapshot_id, external_key, kind, label,
  used_decimal, limit_decimal, remaining_decimal, utilization, unit,
  currency_code, period_starts_at, period_ends_at, resets_at, derivation, resets_source_text`;

export type SaveRefreshInput = {
  expectedConnection?: {
    canonicalAccountKey: string;
    connectedAt: string | null;
  };
  connection: {
    id: string;
    status: ConnectionStatus;
    lastSuccessAt: string | null;
    lastAttemptAt: string;
    nextAllowedRefreshAt: string | null;
    updatedAt: string;
  };
  attempt: RefreshAttemptRecord;
  snapshot?: {
    snapshot: UsageSnapshotRecord;
    windows: UsageWindowRecord[];
  };
};

/**
 * Writes the connection freshness, the refresh attempt, and (when a snapshot is
 * supplied) the snapshot and its windows in one exclusive transaction, so a
 * concurrent refresh can never observe a half-written window set.
 */
export async function saveRefresh(
  db: Database,
  input: SaveRefreshInput,
): Promise<void> {
  await withWriteTransaction(db, (tx) => saveRefreshInTransaction(tx, input));
}

/** Writes inside the caller transaction so connection creation is atomic too. */
export async function saveRefreshInTransaction(
  tx: SqlDriver,
  input: SaveRefreshInput,
): Promise<void> {
  if (input.expectedConnection) {
    const current = await tx.first<{
      status: string;
      canonical_account_key: string;
      connected_at: string | null;
    }>(
      'SELECT status, canonical_account_key, connected_at FROM provider_connections WHERE id = ?',
      [input.connection.id],
    );
    if (
      !current ||
      current.status === 'disconnected' ||
      current.canonical_account_key !==
        input.expectedConnection.canonicalAccountKey ||
      current.connected_at !== input.expectedConnection.connectedAt
    ) {
      throw new ConnectionChangedError();
    }
  }
  await tx.run(
    `UPDATE provider_connections
       SET status = ?, last_success_at = ?, last_attempt_at = ?,
           next_allowed_refresh_at = ?, updated_at = ?
       WHERE id = ?`,
    [
      input.connection.status,
      input.connection.lastSuccessAt,
      input.connection.lastAttemptAt,
      input.connection.nextAllowedRefreshAt,
      input.connection.updatedAt,
      input.connection.id,
    ],
  );

  const attempt = input.attempt;
  await tx.run(
    `INSERT INTO refresh_attempts (id, connection_id, started_at, completed_at,
         trigger, outcome, http_status, error_code, retry_after_at, request_id,
         duration_ms, safe_detail)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         completed_at = excluded.completed_at, outcome = excluded.outcome,
         http_status = excluded.http_status, error_code = excluded.error_code,
         retry_after_at = excluded.retry_after_at, request_id = excluded.request_id,
         duration_ms = excluded.duration_ms, safe_detail = excluded.safe_detail`,
    [
      attempt.id,
      attempt.connectionId,
      attempt.startedAt,
      attempt.completedAt,
      attempt.trigger,
      attempt.outcome,
      attempt.httpStatus,
      attempt.errorCode,
      attempt.retryAfterAt,
      attempt.requestId,
      attempt.durationMs,
      attempt.safeDetail,
    ],
  );

  if (!input.snapshot) return;
  const { snapshot, windows } = input.snapshot;
  await tx.run(
    `INSERT INTO usage_snapshots (${SNAPSHOT_COLUMNS}) VALUES (?,?,?,?,?,?,?,?)`,
    [
      snapshot.id,
      snapshot.connectionId,
      snapshot.fetchedAt,
      snapshot.source,
      snapshot.providerSchemaVersion,
      snapshot.isPartial ? 1 : 0,
      snapshot.responseFingerprint,
      snapshot.createdAt,
    ],
  );
  for (const window of windows) {
    await tx.run(
      `INSERT INTO usage_windows (${WINDOW_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        window.id,
        window.snapshotId,
        window.externalKey,
        window.kind,
        window.label,
        window.usedDecimal,
        window.limitDecimal,
        window.remainingDecimal,
        window.utilization,
        window.unit,
        window.currencyCode,
        window.periodStartsAt,
        window.periodEndsAt,
        window.resetsAt,
        window.derivation,
        window.resetsSourceText ?? null,
      ],
    );
  }
}

export class ConnectionChangedError extends Error {
  constructor() {
    super('Connection changed during refresh');
  }
}

export type ManualImportInput = {
  /** Snapshot with `source: 'manual'` (user-shared CLI stats or manual entry). */
  snapshot: UsageSnapshotRecord;
  windows: UsageWindowRecord[];
  cliStats?: CliStatsImport;
};

/**
 * Persists a user-provided snapshot (for example sanitized Gemini CLI
 * `/stats model` figures) together with its coverage metadata, in one
 * transaction. It never marks the connection as live.
 */
export async function saveManualImport(
  db: Database,
  input: ManualImportInput,
): Promise<void> {
  const { snapshot, windows, cliStats } = input;
  if (snapshot.source !== 'manual') {
    throw new Error('saveManualImport requires a manual-source snapshot');
  }
  await withWriteTransaction(db, async (tx) => {
    await tx.run(
      `INSERT INTO usage_snapshots (${SNAPSHOT_COLUMNS}) VALUES (?,?,?,?,?,?,?,?)`,
      [
        snapshot.id,
        snapshot.connectionId,
        snapshot.fetchedAt,
        snapshot.source,
        snapshot.providerSchemaVersion,
        snapshot.isPartial ? 1 : 0,
        snapshot.responseFingerprint,
        snapshot.createdAt,
      ],
    );
    for (const window of windows) {
      await tx.run(
        `INSERT INTO usage_windows (${WINDOW_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          window.id,
          window.snapshotId,
          window.externalKey,
          window.kind,
          window.label,
          window.usedDecimal,
          window.limitDecimal,
          window.remainingDecimal,
          window.utilization,
          window.unit,
          window.currencyCode,
          window.periodStartsAt,
          window.periodEndsAt,
          window.resetsAt,
          window.derivation,
          window.resetsSourceText ?? null,
        ],
      );
    }
    if (cliStats) {
      await tx.run(
        `INSERT INTO cli_stats_imports (snapshot_id, cli_version, captured_at, coverage, created_at)
         VALUES (?,?,?,?,?)`,
        [
          cliStats.snapshotId,
          cliStats.cliVersion,
          cliStats.capturedAt,
          cliStats.coverage,
          cliStats.createdAt,
        ],
      );
    }
  });
}

async function windowsFor(
  db: Database,
  snapshotIds: string[],
): Promise<Map<string, UsageWindowRecord[]>> {
  const grouped = new Map<string, UsageWindowRecord[]>();
  if (snapshotIds.length === 0) return grouped;
  const placeholders = snapshotIds.map(() => '?').join(', ');
  const rows = await db.all<WindowRow>(
    `SELECT ${WINDOW_COLUMNS} FROM usage_windows
     WHERE snapshot_id IN (${placeholders})
     ORDER BY snapshot_id ASC, external_key ASC`,
    snapshotIds,
  );
  for (const row of rows) {
    const window = toWindow(row);
    const list = grouped.get(window.snapshotId) ?? [];
    list.push(window);
    grouped.set(window.snapshotId, list);
  }
  return grouped;
}

const LATEST_SNAPSHOT_IDS = `SELECT s.id AS id, s.connection_id AS connection_id
  FROM usage_snapshots s
  WHERE s.id = (
    SELECT x.id FROM usage_snapshots x
    WHERE x.connection_id = s.connection_id
    ORDER BY x.fetched_at DESC, x.created_at DESC LIMIT 1
  )`;

async function snapshotsByIds(
  db: Database,
  ids: string[],
): Promise<SnapshotWithWindows[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.all<SnapshotRow>(
    `SELECT ${SNAPSHOT_COLUMNS} FROM usage_snapshots WHERE id IN (${placeholders})`,
    ids,
  );
  const windows = await windowsFor(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    ...toSnapshot(row),
    windows: windows.get(row.id) ?? [],
  }));
}

/** Latest snapshot per connection, keyed by connection id. */
export async function latestByConnection(
  db: Database,
): Promise<Map<string, SnapshotWithWindows>> {
  const rows = await db.all<{ id: string; connection_id: string }>(
    LATEST_SNAPSHOT_IDS,
  );
  const snapshots = await snapshotsByIds(
    db,
    rows.map((row) => row.id),
  );
  const map = new Map<string, SnapshotWithWindows>();
  for (const snapshot of snapshots) map.set(snapshot.connectionId, snapshot);
  return map;
}

/** Latest snapshots for the selected connections (empty selection = all). */
export async function latestForDashboard(
  db: Database,
  connectionIds: string[] = [],
): Promise<SnapshotWithWindows[]> {
  const rows = await db.all<{ id: string; connection_id: string }>(
    LATEST_SNAPSHOT_IDS,
  );
  const allowed = connectionIds.length > 0 ? new Set(connectionIds) : null;
  const ids = rows
    .filter((row) => allowed === null || allowed.has(row.connection_id))
    .map((row) => row.id);
  return snapshotsByIds(db, ids);
}

export type DateRange = { since?: string; until?: string };

export async function history(
  db: Database,
  connectionId: string,
  range: DateRange = {},
): Promise<SnapshotWithWindows[]> {
  const conditions = ['connection_id = ?'];
  const params: (string | null)[] = [connectionId];
  if (range.since) {
    conditions.push('fetched_at >= ?');
    params.push(range.since);
  }
  if (range.until) {
    conditions.push('fetched_at <= ?');
    params.push(range.until);
  }
  const rows = await db.all<SnapshotRow>(
    `SELECT ${SNAPSHOT_COLUMNS} FROM usage_snapshots
     WHERE ${conditions.join(' AND ')}
     ORDER BY fetched_at DESC, created_at DESC`,
    params,
  );
  const windows = await windowsFor(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    ...toSnapshot(row),
    windows: windows.get(row.id) ?? [],
  }));
}

export type RetentionPolicy = {
  historyDays: number;
  failedAttemptDays?: number;
  successfulAttemptDays?: number;
  maxRows?: number;
};

export type PruneReport = {
  snapshotsDeleted: number;
  attemptsDeleted: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function cutoffIso(now: Date, days: number): string {
  if (!Number.isFinite(days) || days < 0) {
    throw new Error('Retention days must be a non-negative number');
  }
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

/**
 * Keeps the latest snapshot per connection forever, removes detailed history
 * older than the retention window, and drops stale non-success attempts.
 */
export async function prune(
  db: Database,
  policy: RetentionPolicy,
  now: Date = new Date(),
): Promise<PruneReport> {
  const historyCutoff = cutoffIso(now, policy.historyDays);
  const attemptCutoff = cutoffIso(now, policy.failedAttemptDays ?? 30);
  const successCutoff =
    policy.successfulAttemptDays === undefined
      ? null
      : cutoffIso(now, policy.successfulAttemptDays);
  const maxRows = policy.maxRows ?? 500;
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 5000)
    throw new Error('maxRows must be between 1 and 5000');
  return withWriteTransaction(db, async (tx) => {
    const latest = await tx.all<{ id: string }>(LATEST_SNAPSHOT_IDS);
    let snapshotsDeleted = 0;
    if (latest.length > 0) {
      const placeholders = latest.map(() => '?').join(', ');
      const result = await tx.run(
        `DELETE FROM usage_snapshots WHERE id IN (
         SELECT id FROM usage_snapshots WHERE fetched_at < ? AND id NOT IN (${placeholders})
         ORDER BY fetched_at ASC LIMIT ?)`,
        [historyCutoff, ...latest.map((row) => row.id), maxRows],
      );
      snapshotsDeleted = result.changes;
    } else {
      const result = await tx.run(
        'DELETE FROM usage_snapshots WHERE id IN (SELECT id FROM usage_snapshots WHERE fetched_at < ? ORDER BY fetched_at ASC LIMIT ?)',
        [historyCutoff, maxRows],
      );
      snapshotsDeleted = result.changes;
    }
    const attempts = await tx.run(
      `DELETE FROM refresh_attempts WHERE id IN (
       SELECT id FROM refresh_attempts WHERE (outcome NOT IN ('success','running') AND started_at < ?)
         OR (outcome = 'success' AND ? IS NOT NULL AND started_at < ?)
       ORDER BY started_at ASC LIMIT ?)`,
      [attemptCutoff, successCutoff, successCutoff, maxRows],
    );
    return { snapshotsDeleted, attemptsDeleted: attempts.changes };
  });
}

export async function saveCliStatsImport(
  db: Database,
  record: CliStatsImport,
): Promise<void> {
  await db.run(
    `INSERT INTO cli_stats_imports (snapshot_id, cli_version, captured_at, coverage, created_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(snapshot_id) DO UPDATE SET
       cli_version = excluded.cli_version, captured_at = excluded.captured_at,
       coverage = excluded.coverage, created_at = excluded.created_at`,
    [
      record.snapshotId,
      record.cliVersion,
      record.capturedAt,
      record.coverage,
      record.createdAt,
    ],
  );
}

export async function getCliStatsImport(
  db: Database,
  snapshotId: string,
): Promise<CliStatsImport | null> {
  const row = await db.first<{
    snapshot_id: string;
    cli_version: string | null;
    captured_at: string;
    coverage: string;
    created_at: string;
  }>('SELECT * FROM cli_stats_imports WHERE snapshot_id = ?', [snapshotId]);
  if (!row) return null;
  return {
    snapshotId: row.snapshot_id,
    cliVersion: row.cli_version,
    capturedAt: row.captured_at,
    coverage: row.coverage as CliStatsImport['coverage'],
    createdAt: row.created_at,
  };
}

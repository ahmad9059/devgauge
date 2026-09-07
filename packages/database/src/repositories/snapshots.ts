import type { ProviderUsage, UsageWindow } from "@devgauge/contracts";

import type { Db } from "../client.js";

export interface SnapshotInsert {
  userId: string;
  connectionId: string;
  provider: string;
  plan: string | null;
  contentHash: string;
  source: string;
  adapterVersion: string | null;
  fetchedAt: string;
  capturedAt: string | null;
  stale: boolean;
  responseStatus: number | null;
}

export interface LatestUsageRow {
  provider: string;
  snapshotId: string;
  fetchedAt: Date;
  updatedAt: Date;
}

export const insertSnapshot = async (
  db: Db,
  input: SnapshotInsert
): Promise<string> => {
  const rows = await db`
    insert into usage_snapshots (
      user_id, connection_id, provider, plan, content_hash, source, adapter_version,
      fetched_at, captured_at, stale, response_status
    )
    values (
      ${input.userId}, ${input.connectionId}, ${input.provider}, ${input.plan},
      ${input.contentHash}, ${input.source}, ${input.adapterVersion},
      ${input.fetchedAt}, ${input.capturedAt}, ${input.stale}, ${input.responseStatus}
    )
    returning id
  `;
  return (rows[0] as unknown as { id: string }).id;
};

export const insertWindows = async (
  db: Db,
  snapshotId: string,
  windows: readonly UsageWindow[]
): Promise<void> => {
  for (const w of windows) {
    await db`
      insert into usage_windows (
        snapshot_id, window_id, label, used_percent, remaining_percent, used, limit_value,
        unit, window_seconds, resets_at, state
      )
      values (
        ${snapshotId}, ${w.id}, ${w.label}, ${w.usedPercent}, ${w.remainingPercent},
        ${w.used}, ${w.limit}, ${w.unit}, ${w.windowSeconds}, ${w.resetsAt}, ${w.state}
      )
    `;
  }
};

export const insertActivityDaily = async (
  db: Db,
  input: {
    userId: string;
    connectionId: string;
    provider: string;
    date: string;
    tokens: number;
    source: string;
  }
): Promise<void> => {
  await db`
    insert into usage_activity_daily (user_id, connection_id, provider, activity_date, tokens, source)
    values (${input.userId}, ${input.connectionId}, ${input.provider}, ${input.date}, ${input.tokens}, ${input.source})
    on conflict (connection_id, activity_date)
    do update set tokens = excluded.tokens
  `;
};

export const setLatestUsage = async (
  db: Db,
  input: { userId: string; provider: string; connectionId: string; snapshotId: string }
): Promise<void> => {
  await db`
    insert into latest_provider_usage (user_id, connection_id, provider, snapshot_id)
    values (${input.userId}, ${input.connectionId}, ${input.provider}, ${input.snapshotId})
    on conflict (user_id, provider)
    do update set snapshot_id = excluded.snapshot_id, updated_at = now()
  `;
};

export const getLatestSnapshotIdsByUser = async (
  db: Db,
  userId: string
): Promise<LatestUsageRow[]> => {
  return db`
    select provider, snapshot_id, updated_at
    from latest_provider_usage
    where user_id = ${userId}
  `;
};

export const getSnapshotWithWindows = async (
  db: Db,
  snapshotId: string,
  userId: string
): Promise<ProviderUsage | undefined> => {
  const snapshots = await db`
    select * from usage_snapshots
    where id = ${snapshotId} and user_id = ${userId}
  `;
  const snapshot = snapshots[0] as
    | {
        provider: string;
        plan: string | null;
        fetchedAt: Date;
        capturedAt: Date | null;
        source: string;
        stale: boolean;
      }
    | undefined;
  if (!snapshot) return undefined;

  const windows = await windowsForSnapshot(db, snapshotId);
  return {
    provider: snapshot.provider as ProviderUsage["provider"],
    plan: snapshot.plan,
    windows: windows.map((w) => ({
      id: w.windowId,
      label: w.label,
      usedPercent: w.usedPercent === null ? null : Number(w.usedPercent),
      remainingPercent: w.remainingPercent === null ? null : Number(w.remainingPercent),
      used: w.used === null ? null : Number(w.used),
      limit: w.limitValue === null ? null : Number(w.limitValue),
      unit: w.unit as UsageWindow["unit"],
      windowSeconds: w.windowSeconds,
      resetsAt: w.resetsAt ? w.resetsAt.toISOString() : null,
      state: w.state as UsageWindow["state"],
    })),
    fetchedAt: snapshot.fetchedAt.toISOString(),
    capturedAt: snapshot.capturedAt ? snapshot.capturedAt.toISOString() : null,
    source: snapshot.source as ProviderUsage["source"],
    stale: snapshot.stale,
  };
};

export interface WindowRow {
  windowId: string;
  label: string;
  usedPercent: number | null;
  remainingPercent: number | null;
  used: number | null;
  limitValue: number | null;
  unit: string | null;
  windowSeconds: number | null;
  resetsAt: Date | null;
  state: string;
}

export const windowsForSnapshot = async (db: Db, snapshotId: string): Promise<WindowRow[]> => {
  return db`
    select window_id, label, used_percent, remaining_percent, used, limit_value,
           unit, window_seconds, resets_at, state
    from usage_windows
    where snapshot_id = ${snapshotId}
    order by resets_at nulls last
  `;
};

export interface HistoryEntry {
  snapshotId: string;
  fetchedAt: Date;
  provider: string;
}

/** Cursor-paginated history for a user/provider, newest first. */
export const listHistory = async (
  db: Db,
  input: { userId: string; provider?: string; beforeId?: string; limit: number }
): Promise<HistoryEntry[]> => {
  const limit = Math.min(Math.max(input.limit, 1), 100);

  const rows = await db`
    select id, fetched_at, provider
    from usage_snapshots
    where user_id = ${input.userId}
      ${input.provider ? db`and provider = ${input.provider}` : db``}
      ${input.beforeId ? db`and id::text < ${input.beforeId}` : db``}
    order by fetched_at desc, id desc
    limit ${limit}
  `;
  return rows.map(
    (r) =>
      ({
        snapshotId: (r as unknown as { id: string }).id,
        fetchedAt: (r as unknown as { fetchedAt: Date }).fetchedAt,
        provider: (r as unknown as { provider: string }).provider,
      }) satisfies HistoryEntry
  );
};
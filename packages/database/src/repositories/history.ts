import type { HistoryPoint, HistoryResolution, ProviderId } from "@devgauge/contracts";

import type { Db } from "../client.js";

export interface HistoryCursorValue {
  at: Date;
  id: string;
}

interface HistoryPointRow {
  snapshotId: string;
  provider: ProviderId;
  windowId: string;
  label: string;
  timestamp: Date;
  usedPercent: number | string | null;
  remainingPercent: number | string | null;
  used: number | string | null;
  limitValue: number | string | null;
  unit: HistoryPoint["unit"];
  resetsAt: Date | null;
  state: HistoryPoint["state"];
  stale: boolean;
  source: HistoryPoint["source"];
}

const numberOrNull = (value: number | string | null): number | null => value === null ? null : Number(value);

const mapPoint = (row: HistoryPointRow): HistoryPoint => ({
  snapshotId: row.snapshotId,
  provider: row.provider,
  windowId: row.windowId,
  label: row.label,
  timestamp: row.timestamp.toISOString(),
  usedPercent: numberOrNull(row.usedPercent),
  remainingPercent: numberOrNull(row.remainingPercent),
  used: numberOrNull(row.used),
  limit: numberOrNull(row.limitValue),
  unit: row.unit,
  resetsAt: row.resetsAt?.toISOString() ?? null,
  state: row.state,
  stale: row.stale,
  source: row.source,
});

export const listHistoryPoints = async (
  db: Db,
  input: {
    userId: string;
    provider: ProviderId;
    windowId?: string;
    from: Date;
    to: Date;
    before?: HistoryCursorValue;
    limit: number;
    resolution: HistoryResolution;
  }
): Promise<HistoryPoint[]> => {
  const limit = Math.min(Math.max(input.limit, 1), 200) + 1;
  if (input.resolution === "daily") {
    const rows = await db`
      select last_snapshot_id as snapshot_id, provider, window_id, label,
             rollup_date::timestamptz as timestamp, last_used_percent as used_percent,
             last_remaining_percent as remaining_percent, last_used as used,
             last_limit_value as limit_value, last_unit as unit, last_resets_at as resets_at,
             last_state as state, false as stale, last_source as source
      from usage_window_rollups_daily
      where user_id = ${input.userId} and provider = ${input.provider}
        and rollup_date >= ${input.from.toISOString().slice(0, 10)}
        and rollup_date <= ${input.to.toISOString().slice(0, 10)}
        ${input.windowId ? db`and window_id = ${input.windowId}` : db``}
        ${input.before ? db`and (rollup_date::timestamptz, last_snapshot_id) < (${input.before.at}, ${input.before.id}::uuid)` : db``}
      order by rollup_date desc, last_snapshot_id desc
      limit ${limit}
    `;
    return rows.map((row) => mapPoint(row as unknown as HistoryPointRow));
  }

  const rows = await db`
    select s.id as snapshot_id, s.provider, w.window_id, w.label, s.fetched_at as timestamp,
           w.used_percent, w.remaining_percent, w.used, w.limit_value, w.unit,
           w.resets_at, w.state, s.stale, s.source
    from usage_snapshots s
    join usage_windows w on w.snapshot_id = s.id
    where s.user_id = ${input.userId} and s.provider = ${input.provider}
      and s.fetched_at >= ${input.from} and s.fetched_at <= ${input.to}
      ${input.windowId ? db`and w.window_id = ${input.windowId}` : db``}
      ${input.before ? db`and (s.fetched_at, s.id) < (${input.before.at}, ${input.before.id}::uuid)` : db``}
    order by s.fetched_at desc, s.id desc
    limit ${limit}
  `;
  return rows.map((row) => mapPoint(row as unknown as HistoryPointRow));
};

export const deleteUsageHistory = async (
  db: Db,
  input: { userId: string; provider?: ProviderId }
): Promise<number> => {
  const rows = await db`
    delete from usage_snapshots
    where user_id = ${input.userId}
      ${input.provider ? db`and provider = ${input.provider}` : db``}
    returning id
  `;
  return rows.length;
};

export const rollupAndRetainUsage = async (db: Db, now = new Date()): Promise<void> => {
  const rawBoundary = new Date(now.getTime() - 90 * 86_400_000);
  const rollupBoundary = new Date(now);
  rollupBoundary.setUTCMonth(rollupBoundary.getUTCMonth() - 13);

  await db.begin(async (sql) => {
    await sql`
      insert into usage_window_rollups_daily (
        user_id, connection_id, provider, window_id, label, rollup_date, sample_count,
        min_used_percent, max_used_percent, last_used_percent, last_remaining_percent,
        last_used, last_limit_value, last_unit, last_resets_at, last_state, last_source, last_snapshot_id
      )
      select s.user_id, s.connection_id, s.provider, w.window_id,
             (array_agg(w.label order by s.fetched_at desc))[1], s.fetched_at::date, count(*)::int,
             min(w.used_percent), max(w.used_percent),
             (array_agg(w.used_percent order by s.fetched_at desc))[1],
             (array_agg(w.remaining_percent order by s.fetched_at desc))[1],
             (array_agg(w.used order by s.fetched_at desc))[1],
             (array_agg(w.limit_value order by s.fetched_at desc))[1],
             (array_agg(w.unit order by s.fetched_at desc))[1],
             (array_agg(w.resets_at order by s.fetched_at desc))[1],
             (array_agg(w.state order by s.fetched_at desc))[1],
             (array_agg(s.source order by s.fetched_at desc))[1],
             (array_agg(s.id order by s.fetched_at desc))[1]
      from usage_snapshots s
      join usage_windows w on w.snapshot_id = s.id
      where s.fetched_at < ${rawBoundary}
      group by s.user_id, s.connection_id, s.provider, w.window_id, s.fetched_at::date
      on conflict (connection_id, window_id, rollup_date) do update set
        sample_count = excluded.sample_count,
        min_used_percent = excluded.min_used_percent,
        max_used_percent = excluded.max_used_percent,
        last_used_percent = excluded.last_used_percent,
        last_remaining_percent = excluded.last_remaining_percent,
        last_used = excluded.last_used,
        last_limit_value = excluded.last_limit_value,
        last_unit = excluded.last_unit,
        last_resets_at = excluded.last_resets_at,
        last_state = excluded.last_state,
        last_source = excluded.last_source,
        last_snapshot_id = excluded.last_snapshot_id
    `;
    await sql`
      delete from usage_snapshots s
      where s.fetched_at < ${rawBoundary}
        and not exists (select 1 from latest_provider_usage l where l.snapshot_id = s.id)
        and exists (
          select 1 from usage_window_rollups_daily r
          where r.connection_id = s.connection_id and r.rollup_date = s.fetched_at::date
        )
    `;
    await sql`delete from usage_window_rollups_daily where rollup_date < ${rollupBoundary.toISOString().slice(0, 10)}`;
    await sql`delete from usage_activity_daily where activity_date < ${rollupBoundary.toISOString().slice(0, 10)}`;
    await sql`delete from deletion_ledger where expires_at <= ${now}`;
  });
};

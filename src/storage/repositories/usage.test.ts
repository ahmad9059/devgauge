import { describe, expect, it } from 'vitest';

import { upsertConnection } from '@/storage/repositories/connections';
import {
  getCliStatsImport,
  history,
  latestByConnection,
  latestForDashboard,
  prune,
  saveCliStatsImport,
  saveRefresh,
} from '@/storage/repositories/usage';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

async function seedConnection(
  db: Awaited<ReturnType<typeof createMigratedTestDatabase>>,
  id = 'c1',
) {
  await upsertConnection(db, makeConnection({ id }));
}

function refreshInput(
  snapshotId: string,
  connectionId: string,
  overrides: {
    fetchedAt?: string;
    windows?: ReturnType<typeof makeWindow>[];
    attemptOutcome?: 'success' | 'failure';
  } = {},
) {
  const fetchedAt = overrides.fetchedAt ?? '2026-09-01T00:00:00.000Z';
  const snapshot = makeSnapshot(connectionId, { id: snapshotId, fetchedAt });
  return {
    connection: {
      id: connectionId,
      status: 'connected' as const,
      lastSuccessAt: fetchedAt,
      lastAttemptAt: fetchedAt,
      nextAllowedRefreshAt: null,
      updatedAt: fetchedAt,
    },
    attempt: makeAttempt(connectionId, {
      id: `attempt-${snapshotId}`,
      startedAt: fetchedAt,
      outcome: overrides.attemptOutcome ?? 'success',
    }),
    snapshot: {
      snapshot,
      windows: (overrides.windows ?? []).map((window) => ({
        ...window,
        snapshotId,
      })),
    },
  };
}

describe('usage repository', () => {
  it('writes a snapshot with all its windows in one refresh', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    const windows = [
      makeWindow('', { externalKey: 'five-hour', label: '5-hour window' }),
      makeWindow('', { externalKey: 'weekly', label: 'Weekly' }),
    ];
    await saveRefresh(db, refreshInput('s1', 'c1', { windows }));

    const latest = await latestByConnection(db);
    const snapshot = latest.get('c1');
    expect(snapshot?.id).toBe('s1');
    expect(snapshot?.windows.map((window) => window.externalKey)).toEqual([
      'five-hour',
      'weekly',
    ]);
  });

  it('keeps unknown values null instead of inventing zeroes', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    await saveRefresh(
      db,
      refreshInput('s1', 'c1', {
        windows: [
          makeWindow('', {
            externalKey: 'unknown',
            usedDecimal: null,
            limitDecimal: null,
            remainingDecimal: null,
            utilization: null,
          }),
        ],
      }),
    );
    const window = (await latestByConnection(db)).get('c1')?.windows[0];
    expect(window?.usedDecimal).toBeNull();
    expect(window?.limitDecimal).toBeNull();
    expect(window?.remainingDecimal).toBeNull();
    expect(window?.utilization).toBeNull();
  });

  it('rolls back the whole refresh when a window violates a constraint', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    const duplicateKey = [
      makeWindow('', { externalKey: 'dup' }),
      makeWindow('', { externalKey: 'dup' }),
    ];
    await expect(
      saveRefresh(db, refreshInput('s1', 'c1', { windows: duplicateKey })),
    ).rejects.toThrow();

    const snapshots = await db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM usage_snapshots',
    );
    const attempts = await db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM refresh_attempts',
    );
    expect(snapshots?.c).toBe(0);
    expect(attempts?.c).toBe(0);
  });

  it('rejects an invalid unit through the CHECK constraint', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    await saveRefresh(db, refreshInput('s1', 'c1', { windows: [] }));
    await expect(
      db.run(
        `INSERT INTO usage_windows (
           id, snapshot_id, external_key, kind, label, unit, derivation)
         VALUES ('w','s1','k','rolling','X','bananas','provider')`,
      ),
    ).rejects.toThrow();
  });

  it('returns latest per connection and filters by dashboard selection', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db, 'c1');
    await seedConnection(db, 'c2');
    await saveRefresh(
      db,
      refreshInput('s1', 'c1', { fetchedAt: '2026-09-01T00:00:00.000Z' }),
    );
    await saveRefresh(
      db,
      refreshInput('s2', 'c2', { fetchedAt: '2026-09-02T00:00:00.000Z' }),
    );

    const selected = await latestForDashboard(db, ['c2']);
    expect(selected.map((snapshot) => snapshot.connectionId)).toEqual(['c2']);
    expect((await latestForDashboard(db)).length).toBe(2);
  });

  it('returns history inside a date range, newest first', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    await saveRefresh(
      db,
      refreshInput('s1', 'c1', { fetchedAt: '2026-08-01T00:00:00.000Z' }),
    );
    await saveRefresh(
      db,
      refreshInput('s2', 'c1', { fetchedAt: '2026-09-01T00:00:00.000Z' }),
    );

    const range = await history(db, 'c1', {
      since: '2026-08-15T00:00:00.000Z',
    });
    expect(range.map((snapshot) => snapshot.id)).toEqual(['s2']);
    const all = await history(db, 'c1');
    expect(all.map((snapshot) => snapshot.id)).toEqual(['s2', 's1']);
  });

  it('prunes old history but keeps the latest snapshot and recent attempts', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    await saveRefresh(
      db,
      refreshInput('old', 'c1', { fetchedAt: '2026-01-01T00:00:00.000Z' }),
    );
    await saveRefresh(
      db,
      refreshInput('new', 'c1', { fetchedAt: '2026-09-20T00:00:00.000Z' }),
    );

    const report = await prune(
      db,
      { historyDays: 90, failedAttemptDays: 30 },
      new Date('2026-09-27T00:00:00.000Z'),
    );
    expect(report.snapshotsDeleted).toBe(1);
    const remaining = await history(db, 'c1');
    expect(remaining.map((snapshot) => snapshot.id)).toEqual(['new']);
  });

  it('bounds `prune` retention days', async () => {
    const db = await createMigratedTestDatabase();
    await expect(prune(db, { historyDays: -1 })).rejects.toThrow(/retention/i);
  });
  it('bounds each maintenance batch and keeps the newest snapshot even when all history is old', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    for (let index = 1; index <= 4; index++) {
      await saveRefresh(
        db,
        refreshInput(`old-${index}`, 'c1', {
          fetchedAt: `2026-01-0${index}T00:00:00.000Z`,
        }),
      );
    }
    const report = await prune(
      db,
      { historyDays: 1, successfulAttemptDays: 1, maxRows: 1 },
      new Date('2026-10-01T00:00Z'),
    );
    expect(report).toEqual({ snapshotsDeleted: 1, attemptsDeleted: 1 });
    expect((await history(db, 'c1')).map((snapshot) => snapshot.id)).toEqual([
      'old-4',
      'old-3',
      'old-2',
    ]);
    for (let index = 0; index < 4; index++)
      await prune(
        db,
        { historyDays: 1, successfulAttemptDays: 1, maxRows: 1 },
        new Date('2026-10-01T00:00Z'),
      );
    expect((await history(db, 'c1')).map((snapshot) => snapshot.id)).toEqual([
      'old-4',
    ]);
  });

  it('persists and reads Gemini CLI import metadata', async () => {
    const db = await createMigratedTestDatabase();
    await seedConnection(db);
    await saveRefresh(db, refreshInput('s1', 'c1', { windows: [] }));
    await saveCliStatsImport(db, {
      snapshotId: 's1',
      cliVersion: '0.5.0',
      capturedAt: '2026-09-01T00:00:00.000Z',
      coverage: 'session',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    const record = await getCliStatsImport(db, 's1');
    expect(record?.coverage).toBe('session');
    expect(record?.cliVersion).toBe('0.5.0');
  });
});

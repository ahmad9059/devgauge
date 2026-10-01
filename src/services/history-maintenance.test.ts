import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeConnection,
  makeSnapshot,
  makeAttempt,
} from '@/testing/storage/factory';
import { upsertConnection } from '@/storage/repositories/connections';
import { history, saveRefresh } from '@/storage/repositories/usage';
import {
  scheduleHistoryMaintenance,
  historyMaintenanceStatus,
} from './history-maintenance';

afterEach(() => vi.useRealTimers());
describe('post-sync retention maintenance', () => {
  it('defers deletion beyond completion, coalesces callbacks, and keeps the last good snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00Z'));
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));
    for (const [id, fetchedAt] of [
      ['old', '2026-01-01T00:00Z'],
      ['latest', '2026-09-30T00:00Z'],
    ]) {
      await saveRefresh(db, {
        connection: {
          id: 'c1',
          status: 'connected',
          lastSuccessAt: fetchedAt,
          lastAttemptAt: fetchedAt,
          nextAllowedRefreshAt: null,
          updatedAt: fetchedAt,
        },
        attempt: makeAttempt('c1', {
          id: `attempt-${id}`,
          startedAt: fetchedAt,
        }),
        snapshot: {
          snapshot: makeSnapshot('c1', { id, fetchedAt }),
          windows: [],
        },
      });
    }
    scheduleHistoryMaintenance(db);
    scheduleHistoryMaintenance(db);
    expect(vi.getTimerCount()).toBe(1);
    expect(await history(db, 'c1')).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect((await history(db, 'c1')).map((snapshot) => snapshot.id)).toEqual([
      'latest',
    ]);
    expect(historyMaintenanceStatus(db)).toMatchObject({
      pending: false,
      error: false,
      historyDays: 90,
    });
    expect(historyMaintenanceStatus(db).completedAt).toBeGreaterThan(0);
  });
});

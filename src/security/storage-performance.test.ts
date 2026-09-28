import { describe, expect, it } from 'vitest';

import { upsertConnection } from '@/storage/repositories/connections';
import {
  history,
  latestByConnection,
  saveRefresh,
} from '@/storage/repositories/usage';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');

describe('release performance: storage budget', () => {
  it('writes and reads a long history within a generous budget', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));

    const writeStart = performance.now();
    for (let index = 0; index < 300; index += 1) {
      const fetchedAt = new Date(NOW.getTime() - index * 60_000).toISOString();
      await saveRefresh(db, {
        connection: {
          id: 'c1',
          status: 'connected',
          lastSuccessAt: fetchedAt,
          lastAttemptAt: fetchedAt,
          nextAllowedRefreshAt: null,
          updatedAt: fetchedAt,
        },
        attempt: makeAttempt('c1', { id: `a${index}` }),
        snapshot: {
          snapshot: makeSnapshot('c1', { id: `s${index}`, fetchedAt }),
          windows: [makeWindow(`s${index}`, { externalKey: `w${index}` })],
        },
      });
    }
    const writeMs = performance.now() - writeStart;

    const readStart = performance.now();
    const latest = await latestByConnection(db);
    const historyRows = await history(db, 'c1');
    const readMs = performance.now() - readStart;

    expect(latest.get('c1')?.id).toBe('s0');
    expect(historyRows).toHaveLength(300);
    // Loose budgets: guard against pathological regressions, not micro-timing.
    expect(writeMs).toBeLessThan(30_000);
    expect(readMs).toBeLessThan(5_000);
  });
});

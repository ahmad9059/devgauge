import { describe, expect, it } from 'vitest';

import {
  deleteConnection,
  getConnection,
  listConnections,
  markConnectionDisconnected,
  upsertConnection,
} from '@/storage/repositories/connections';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeSnapshot,
} from '@/testing/storage/factory';
import { saveRefresh } from '@/storage/repositories/usage';

describe('connection repository', () => {
  it('inserts, lists, updates, and reads a connection', async () => {
    const db = await createMigratedTestDatabase();
    const connection = makeConnection({ id: 'c1' });

    await upsertConnection(db, connection);
    expect(await listConnections(db)).toEqual([connection]);
    expect(await getConnection(db, 'c1')).toEqual(connection);

    await upsertConnection(db, { ...connection, status: 'expired' });
    expect((await getConnection(db, 'c1'))?.status).toBe('expired');
  });

  it('replaces a conflicting canonical account row transactionally', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(
      db,
      makeConnection({ id: 'pending', canonicalAccountKey: 'claude:pending' }),
    );
    await upsertConnection(
      db,
      makeConnection({ id: 'resolved', canonicalAccountKey: 'claude:pending' }),
    );

    const connections = await listConnections(db);
    expect(connections.map((row) => row.id)).toEqual(['resolved']);
  });

  it('enforces the canonical uniqueness constraint at the schema level', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(
      db,
      makeConnection({ id: 'a', canonicalAccountKey: 'claude:same' }),
    );
    await expect(
      db.run(
        `INSERT INTO provider_connections (
           id, provider_id, account_scope, canonical_account_key, auth_mode,
           status, created_at, updated_at)
         VALUES ('b','claude','personal','claude:same','manual','connected',?,?)`,
        ['2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
      ),
    ).rejects.toThrow();
  });

  it('rejects an unknown provider id via the CHECK constraint', async () => {
    const db = await createMigratedTestDatabase();
    await expect(
      db.run(
        `INSERT INTO provider_connections (
           id, provider_id, account_scope, canonical_account_key, auth_mode,
           status, created_at, updated_at)
         VALUES ('x','not-a-provider','personal','k','manual','connected',?,?)`,
        ['2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
      ),
    ).rejects.toThrow();
  });

  it('marks a connection disconnected without deleting history', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));
    await markConnectionDisconnected(db, 'c1', '2026-09-10T00:00:00.000Z');
    const connection = await getConnection(db, 'c1');
    expect(connection?.status).toBe('disconnected');
    expect(connection?.disconnectedAt).toBe('2026-09-10T00:00:00.000Z');
  });

  it('cascades snapshot and attempt deletion when a connection is removed', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));
    const snapshot = makeSnapshot('c1', { id: 's1' });
    await saveRefresh(db, {
      connection: {
        id: 'c1',
        status: 'connected',
        lastSuccessAt: snapshot.fetchedAt,
        lastAttemptAt: snapshot.fetchedAt,
        nextAllowedRefreshAt: null,
        updatedAt: snapshot.fetchedAt,
      },
      attempt: makeAttempt('c1', { id: 'a1' }),
      snapshot: { snapshot, windows: [] },
    });

    await deleteConnection(db, 'c1');

    const snapshots = await db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM usage_snapshots',
    );
    const attempts = await db.first<{ c: number }>(
      'SELECT COUNT(*) AS c FROM refresh_attempts',
    );
    expect(snapshots?.c).toBe(0);
    expect(attempts?.c).toBe(0);
  });

  it('treats a malicious id as a bound value, not SQL', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));
    const attack = await getConnection(db, "' OR '1'='1");
    expect(attack).toBeNull();
    expect((await listConnections(db)).length).toBe(1);
  });
});

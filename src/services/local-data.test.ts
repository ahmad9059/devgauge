import { describe, expect, it } from 'vitest';

import {
  deleteAllLocalData,
  disconnectConnection,
  type NotificationCanceller,
} from '@/services/local-data';
import { SQLCIPHER_KEY_SECRET } from '@/storage/database-key';
import {
  getConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { upsertManualResetEntry } from '@/storage/repositories/manual-reset';
import {
  listScheduledNotifications,
  upsertNotificationRule,
  upsertScheduledNotification,
} from '@/storage/repositories/notifications';
import { setSetting } from '@/storage/repositories/settings';
import { latestByConnection, saveRefresh } from '@/storage/repositories/usage';
import { createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeManualReset,
  makeRule,
  makeScheduled,
  makeSnapshot,
} from '@/testing/storage/factory';

const NOW = '2026-09-27T00:00:00.000Z';

function makeCanceller() {
  const calls: string[] = [];
  const canceller: NotificationCanceller = {
    async cancelForConnection(id) {
      calls.push(`connection:${id}`);
    },
    async cancelAll() {
      calls.push('all');
    },
  };
  return { canceller, calls };
}

async function seedConnection(
  db: Awaited<ReturnType<typeof createMigratedTestDatabase>>,
  id: string,
) {
  const connection = makeConnection({ id });
  await upsertConnection(db, connection);
  await saveRefresh(db, {
    connection: {
      id,
      status: 'connected',
      lastSuccessAt: NOW,
      lastAttemptAt: NOW,
      nextAllowedRefreshAt: null,
      updatedAt: NOW,
    },
    attempt: makeAttempt(id),
    snapshot: {
      snapshot: makeSnapshot(id, { id: `snap-${id}`, fetchedAt: NOW }),
      windows: [],
    },
  });
  return connection;
}

describe('disconnect and delete lifecycle', () => {
  it('keeps the database key when file deletion fails and permits cleanup retry', async () => {
    const db = await createMigratedTestDatabase();
    const key = 'a'.repeat(64);
    const store = createMemorySecretStore({ [SQLCIPHER_KEY_SECRET]: key });
    const vault = createSecureVault(store);
    await seedConnection(db, 'c1');
    const { canceller } = makeCanceller();
    await expect(
      deleteAllLocalData(db, {
        vault,
        secretStore: store,
        canceller,
        resetDatabaseFile: async () => {
          expect(await store.get(SQLCIPHER_KEY_SECRET)).toBe(key);
          throw new Error('file removal failed');
        },
      }),
    ).rejects.toThrow('file removal failed');
    expect(await store.get(SQLCIPHER_KEY_SECRET)).toBe(key);
    expect(await getConnection(db, 'c1')).toBeNull();
    const retry = await deleteAllLocalData(db, {
      vault,
      secretStore: store,
      canceller,
      resetDatabaseFile: async () => {
        expect(await store.get(SQLCIPHER_KEY_SECRET)).toBe(key);
      },
    });
    expect(retry.databaseFileReset).toBe(true);
    expect(await store.get(SQLCIPHER_KEY_SECRET)).toBeNull();
  });

  it('retains credentials and records if native cancellation fails', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore({
      [SQLCIPHER_KEY_SECRET]: 'a'.repeat(64),
    });
    const vault = createSecureVault(store);
    const connection = await seedConnection(db, 'c1');
    await vault.save(connection.credentialRef as string, {
      version: 1,
      kind: 'oauth',
      accessToken: 'secret-access',
    });
    let fileReset = false;
    await expect(
      deleteAllLocalData(db, {
        vault,
        secretStore: store,
        canceller: {
          async cancelForConnection() {},
          async cancelAll() {
            throw new Error('native cancellation failed');
          },
        },
        resetDatabaseFile: async () => {
          fileReset = true;
        },
      }),
    ).rejects.toThrow('native cancellation failed');
    expect(await getConnection(db, 'c1')).not.toBeNull();
    expect(await vault.load(connection.credentialRef as string)).not.toBeNull();
    expect(await store.get(SQLCIPHER_KEY_SECRET)).not.toBeNull();
    expect(fileReset).toBe(false);
  });

  it('disconnect with history removes the credential, schedules, and rows', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore();
    const vault = createSecureVault(store);
    const connection = await seedConnection(db, 'c1');
    await vault.save(connection.credentialRef as string, {
      version: 1,
      kind: 'oauth',
      accessToken: 'secret-access',
    });
    await upsertNotificationRule(db, makeRule({ id: 'r1' }));
    await upsertScheduledNotification(
      db,
      makeScheduled('r1', { id: 'sch1', connectionId: 'c1' }),
    );
    const { canceller, calls } = makeCanceller();

    const result = await disconnectConnection(
      db,
      { vault, secretStore: store, canceller },
      'c1',
      { deleteHistory: true, now: NOW },
    );

    expect(result).toEqual({
      credentialRemoved: true,
      historyDeleted: true,
      schedulesCancelled: 1,
    });
    expect(await getConnection(db, 'c1')).toBeNull();
    expect(await listScheduledNotifications(db)).toHaveLength(0);
    expect(await store.get(connection.credentialRef as string)).toBeNull();
    expect(calls).toContain('connection:c1');
  });

  it('disconnect without history keeps the snapshot but removes the credential', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore();
    const vault = createSecureVault(store);
    const connection = await seedConnection(db, 'c1');
    await vault.save(connection.credentialRef as string, {
      version: 1,
      kind: 'oauth',
      accessToken: 'secret-access',
    });
    const { canceller } = makeCanceller();

    const result = await disconnectConnection(
      db,
      { vault, secretStore: store, canceller },
      'c1',
      { deleteHistory: false, now: NOW },
    );

    expect(result.historyDeleted).toBe(false);
    const stored = await getConnection(db, 'c1');
    expect(stored?.status).toBe('disconnected');
    expect((await latestByConnection(db)).get('c1')?.id).toBe('snap-c1');
    expect(await store.get(connection.credentialRef as string)).toBeNull();
  });

  it('delete-all clears every table, secret, and the database key', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore({
      [SQLCIPHER_KEY_SECRET]: 'a'.repeat(64),
    });
    const vault = createSecureVault(store);
    const connection = await seedConnection(db, 'c1');
    await vault.save(connection.credentialRef as string, {
      version: 1,
      kind: 'oauth',
      accessToken: 'secret-access',
    });
    await upsertManualResetEntry(db, makeManualReset({ id: 'm1' }));
    await setSetting(db, 'appearance.theme', 'dark', NOW);
    const { canceller, calls } = makeCanceller();
    let fileReset = false;

    const report = await deleteAllLocalData(db, {
      vault,
      secretStore: store,
      canceller,
      resetDatabaseFile: async () => {
        fileReset = true;
      },
    });

    expect(report.connections).toBe(1);
    expect(report.credentialRefsRemoved).toBe(1);
    expect(report.databaseKeyDeleted).toBe(true);
    expect(report.notificationsCancelled).toBe(true);
    expect(report.databaseFileReset).toBe(true);
    expect(store.entries()).toEqual({});
    expect(calls).toEqual(['all']);
    expect(fileReset).toBe(true);

    for (const table of [
      'provider_connections',
      'usage_snapshots',
      'usage_windows',
      'refresh_attempts',
      'notification_rules',
      'scheduled_notifications',
      'manual_reset_entries',
      'app_settings',
    ]) {
      const row = await db.first<{ c: number }>(
        `SELECT COUNT(*) AS c FROM ${table}`,
      );
      expect(row?.c, `${table} should be empty`).toBe(0);
    }
  });
});

import { describe, expect, it } from 'vitest';

import { configureDatabase, migrate } from '@/storage/database';
import { migrations, runMigrations } from '@/storage/migrations';
import { migration0001 } from '@/storage/migrations/0001-initial-schema';
import type { Migration } from '@/storage/migrations/types';
import { createTestDatabase } from '@/testing/storage/database';
import { upsertConnection } from '@/storage/repositories/connections';
import { latestByConnection, saveRefresh } from '@/storage/repositories/usage';
import {
  makeConnection,
  makeAttempt,
  makeSnapshot,
} from '@/testing/storage/factory';

async function tableNames(db: {
  all<T>(source: string): Promise<T[]>;
}): Promise<string[]> {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

const EXPECTED_TABLES = [
  'app_settings',
  'cli_stats_imports',
  'manual_reset_entries',
  'notification_operations',
  'notification_rules',
  'provider_connections',
  'refresh_attempts',
  'scheduled_notifications',
  'usage_snapshots',
  'usage_windows',
];

describe('migrations', () => {
  it('preserves original reset text and quantities in installed version-one data', async () => {
    const db = createTestDatabase();
    await configureDatabase(db, { journalModeWAL: false });
    await runMigrations(db, [migration0001]);
    await upsertConnection(db, makeConnection({ id: 'legacy' }));
    await db.run(
      `INSERT INTO usage_snapshots
      (id,connection_id,fetched_at,source,provider_schema_version,is_partial,created_at)
      VALUES (?,?,?,'live',1,0,?)`,
      ['s', 'legacy', '2026-09-30T00:00:00Z', '2026-09-30T00:00:00Z'],
    );
    await db.run(
      `INSERT INTO usage_windows
      (id,snapshot_id,external_key,kind,label,used_decimal,unit,resets_at,derivation)
      VALUES ('w','s','session.primary','rolling','Session','1','percent',?,'provider')`,
      ['in 4h 41m'],
    );
    await migrate(db);
    const window = (await latestByConnection(db)).get('legacy')?.windows[0];
    expect(window?.usedDecimal).toBe('1');
    expect(window?.resetsSourceText).toBe('in 4h 41m');
    expect(window?.resetsAt).toBe('in 4h 41m');
    await saveRefresh(db, {
      connection: {
        id: 'legacy',
        status: 'connected',
        lastSuccessAt: '2026-10-01T00:00:00Z',
        lastAttemptAt: '2026-10-01T00:00:00Z',
        nextAllowedRefreshAt: null,
        updatedAt: '2026-10-01T00:00:00Z',
      },
      attempt: makeAttempt('legacy'),
      snapshot: { snapshot: makeSnapshot('legacy'), windows: [] },
    });
  });
  it('preserves pending schedules as recoverable intents when upgrading v2', async () => {
    const db = createTestDatabase();
    await runMigrations(db, migrations.slice(0, 2));
    await db.run(`INSERT INTO notification_rules
      (id,provider_id,rule_type,enabled,created_at,updated_at)
      VALUES ('legacy-rule','claude','reset-reminder',1,'2026-10-01','2026-10-01')`);
    await db.run(`INSERT INTO scheduled_notifications
      (id,rule_id,native_identifier,scheduled_for,status,created_at,updated_at)
      VALUES ('legacy-schedule','legacy-rule','devgauge.reminder.legacy',
      '2026-10-02T00:00:00.000Z','scheduled','2026-10-01','2026-10-01')`);
    await migrate(db);
    const operation = await db.first<{ request_json: string; state: string }>(
      'SELECT request_json,state FROM notification_operations',
    );
    expect(operation?.state).toBe('pending');
    expect(JSON.parse(operation!.request_json)).toMatchObject({
      id: 'legacy',
      providerId: 'claude',
      at: '2026-10-02T00:00:00.000Z',
    });
    expect(await db.first('SELECT id FROM scheduled_notifications')).toEqual({
      id: 'legacy-schedule',
    });
  });

  it('migrates an empty database to the latest schema exactly once', async () => {
    const db = createTestDatabase();
    await configureDatabase(db, { journalModeWAL: false });

    const version = await migrate(db);

    expect(version).toBe(3);
    expect(await db.userVersion()).toBe(3);
    expect(await tableNames(db)).toEqual(EXPECTED_TABLES);
  });

  it('is idempotent when run again', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const before = await tableNames(db);
    await migrate(db);
    expect(await db.userVersion()).toBe(3);
    expect(await tableNames(db)).toEqual(before);
  });

  it('upgrades a prior-version fixture without data loss', async () => {
    const db = createTestDatabase();
    await configureDatabase(db, { journalModeWAL: false });
    await runMigrations(db, [migration0001]);
    await db.run(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?,?,?)`,
      ['legacy.key', '"kept"', '2026-09-01T00:00:00.000Z'],
    );

    const versionTwo: Migration = {
      version: 2,
      name: 'add-connection-note',
      sql: 'ALTER TABLE provider_connections ADD COLUMN note TEXT;',
    };
    const version = await runMigrations(db, [migration0001, versionTwo]);

    expect(version).toBe(2);
    const kept = await db.first<{ value_json: string }>(
      'SELECT value_json FROM app_settings WHERE key = ?',
      ['legacy.key'],
    );
    expect(kept?.value_json).toBe('"kept"');
    const columns = await db.all<{ name: string }>(
      'PRAGMA table_info(provider_connections)',
    );
    expect(columns.map((column) => column.name)).toContain('note');
  });

  it('rolls back and preserves the prior database when a migration fails', async () => {
    const db = createTestDatabase();
    await configureDatabase(db, { journalModeWAL: false });
    await runMigrations(db, [migration0001]);
    await db.run(
      `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?,?,?)`,
      ['stable.key', '"stable"', '2026-09-01T00:00:00.000Z'],
    );

    const broken: Migration = {
      version: 2,
      name: 'broken',
      sql: 'CREATE TABLE partial_work (id TEXT); SELECT this_is_not_valid_sql;',
    };
    await expect(runMigrations(db, [migration0001, broken])).rejects.toThrow();

    expect(await db.userVersion()).toBe(1);
    const kept = await db.first<{ value_json: string }>(
      'SELECT value_json FROM app_settings WHERE key = ?',
      ['stable.key'],
    );
    expect(kept?.value_json).toBe('"stable"');
    expect(await tableNames(db)).not.toContain('partial_work');
  });

  it('rejects a non-sequential migration plan', async () => {
    const db = createTestDatabase();
    const gap: Migration = { version: 3, name: 'gap', sql: 'SELECT 1;' };
    await expect(runMigrations(db, [gap])).rejects.toThrow(
      /sequential from version 1/,
    );
  });

  it('ships exactly the declared migrations', () => {
    expect(migrations.map((migration) => migration.version)).toEqual([1, 2, 3]);
  });
});

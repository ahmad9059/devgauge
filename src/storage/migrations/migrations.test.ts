import { describe, expect, it } from 'vitest';

import { configureDatabase, migrate } from '@/storage/database';
import { migrations, runMigrations } from '@/storage/migrations';
import { migration0001 } from '@/storage/migrations/0001-initial-schema';
import type { Migration } from '@/storage/migrations/types';
import { createTestDatabase } from '@/testing/storage/database';

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
  'notification_rules',
  'provider_connections',
  'refresh_attempts',
  'scheduled_notifications',
  'usage_snapshots',
  'usage_windows',
];

describe('migrations', () => {
  it('migrates an empty database to the latest schema exactly once', async () => {
    const db = createTestDatabase();
    await configureDatabase(db, { journalModeWAL: false });

    const version = await migrate(db);

    expect(version).toBe(1);
    expect(await db.userVersion()).toBe(1);
    expect(await tableNames(db)).toEqual(EXPECTED_TABLES);
  });

  it('is idempotent when run again', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const before = await tableNames(db);
    await migrate(db);
    expect(await db.userVersion()).toBe(1);
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
    expect(migrations.map((migration) => migration.version)).toEqual([1]);
  });
});

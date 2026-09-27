import { DatabaseSync } from 'node:sqlite';

import type {
  SqlDriver,
  SqlRunResult,
  SqlValue,
} from '@/storage/sqlite-driver';

/**
 * Test-only adapter over Node's built-in SQLite. It mirrors the expo-sqlite
 * driver surface so repositories and migrations are exercised against a real
 * SQLite engine (foreign keys, cascades, CHECK constraints, bound parameters)
 * without a device.
 */
export function createNodeSqliteDriver(db: DatabaseSync): SqlDriver {
  return {
    async exec(source: string): Promise<void> {
      db.exec(source);
    },
    async run(source: string, params: SqlValue[] = []): Promise<SqlRunResult> {
      const result = db.prepare(source).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async first<T>(source: string, params: SqlValue[] = []): Promise<T | null> {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async all<T>(source: string, params: SqlValue[] = []): Promise<T[]> {
      return db.prepare(source).all(...params) as T[];
    },
    async close(): Promise<void> {
      db.close();
    },
  };
}

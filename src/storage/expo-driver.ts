import type { SQLiteDatabase } from 'expo-sqlite';

import type { SqlDriver, SqlRunResult, SqlValue } from './sqlite-driver';

/** Runtime adapter over expo-sqlite. App-only; never imported by tests. */
export function createExpoSqliteDriver(db: SQLiteDatabase): SqlDriver {
  return {
    exec: (source) => db.execAsync(source),
    async run(source: string, params: SqlValue[] = []): Promise<SqlRunResult> {
      const result = await db.runAsync(source, ...params);
      return {
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowId,
      };
    },
    async first<T>(source: string, params: SqlValue[] = []): Promise<T | null> {
      return (await db.getFirstAsync(source, ...params)) as T | null;
    },
    async all<T>(source: string, params: SqlValue[] = []): Promise<T[]> {
      return (await db.getAllAsync(source, ...params)) as T[];
    },
    close: () => db.closeAsync(),
  };
}

import type { SqlDriver, SqlValue } from '../sqlite-driver';
import { migration0001 } from './0001-initial-schema';
import { migration0002 } from './0002-reset-source-text';
import type { Migration } from './types';

export type { Migration };

export const migrations: readonly Migration[] = [migration0001, migration0002];

export interface MigrationRunner {
  exec(source: string): Promise<void>;
  first<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  transaction<T>(task: (tx: SqlDriver) => Promise<T>): Promise<T>;
}

export async function readUserVersion(db: {
  first<T>(source: string, params?: SqlValue[]): Promise<T | null>;
}): Promise<number> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version;
  return typeof version === 'number' ? version : 0;
}

function assertSequential(plan: readonly Migration[]): void {
  plan.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migrations must be sequential from version 1; found ${migration.version} at index ${index}`,
      );
    }
  });
}

/**
 * Applies every pending migration in its own exclusive transaction and sets
 * `PRAGMA user_version` after success. A failed migration rolls back and leaves
 * the prior version usable.
 */
export async function runMigrations(
  db: MigrationRunner,
  plan: readonly Migration[] = migrations,
): Promise<number> {
  assertSequential(plan);
  let current = await readUserVersion(db);

  for (const migration of plan) {
    if (migration.version <= current) continue;
    if (migration.version !== current + 1) {
      throw new Error(
        `Missing migration ${current + 1} before version ${migration.version}`,
      );
    }
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      // user_version is an integer from our own immutable plan, not user input.
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }

  return current;
}

import {
  migrations as defaultMigrations,
  readUserVersion,
  runMigrations,
  type Migration,
} from './migrations';
import type { SqlDriver } from './sqlite-driver';

export interface Database extends SqlDriver {
  /**
   * Runs `task` inside an exclusive transaction, serialized against other
   * transactions. The task must use the provided `tx`, never `db.transaction`.
   */
  transaction<T>(task: (tx: SqlDriver) => Promise<T>): Promise<T>;
  userVersion(): Promise<number>;
}

export function createDatabase(driver: SqlDriver): Database {
  let tail: Promise<unknown> = Promise.resolve();
  let inside = false;

  const transaction = <T>(task: (tx: SqlDriver) => Promise<T>): Promise<T> => {
    if (inside) {
      return Promise.reject(
        new Error('Nested transactions are not supported; use the provided tx'),
      );
    }
    const execute = async (): Promise<T> => {
      inside = true;
      await driver.exec('BEGIN EXCLUSIVE');
      let committed = false;
      try {
        const result = await task(driver);
        await driver.exec('COMMIT');
        committed = true;
        return result;
      } finally {
        if (!committed) {
          try {
            await driver.exec('ROLLBACK');
          } catch {
            // The transaction may already be closed; nothing else to do.
          }
        }
        inside = false;
      }
    };
    // Queue behind the previous transaction so writes never interleave.
    const result = tail.then(execute, execute);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    ...driver,
    transaction,
    userVersion: () => readUserVersion(driver),
  };
}

export type ConfigureOptions = {
  journalModeWAL?: boolean;
  busyTimeoutMs?: number;
};

/** Applies the documented pragmas. The SQLCipher key must be set before this. */
export async function configureDatabase(
  db: SqlDriver,
  options: ConfigureOptions = {},
): Promise<void> {
  const { journalModeWAL = true, busyTimeoutMs = 5000 } = options;
  if (!Number.isFinite(busyTimeoutMs) || busyTimeoutMs < 0) {
    throw new Error('busyTimeoutMs must be a non-negative number');
  }
  await db.exec('PRAGMA foreign_keys = ON');
  if (journalModeWAL) {
    await db.exec('PRAGMA journal_mode = WAL');
  }
  // PRAGMA does not accept bound parameters; the value is a validated integer.
  await db.exec(`PRAGMA busy_timeout = ${Math.floor(busyTimeoutMs)}`);
}

export async function migrate(
  db: Database,
  plan: readonly Migration[] = defaultMigrations,
): Promise<number> {
  return runMigrations(db, plan);
}

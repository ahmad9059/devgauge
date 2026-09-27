import { DatabaseSync } from 'node:sqlite';

import {
  configureDatabase,
  createDatabase,
  migrate,
  type Database,
} from '@/storage/database';
import { createNodeSqliteDriver } from './node-driver';

/** In-memory SQLite database with the migration runner only. */
export function createTestDatabase(): Database {
  return createDatabase(createNodeSqliteDriver(new DatabaseSync(':memory:')));
}

/** In-memory database configured and migrated to the latest schema. */
export async function createMigratedTestDatabase(): Promise<Database> {
  const db = createTestDatabase();
  await configureDatabase(db, { journalModeWAL: false });
  await migrate(db);
  return db;
}

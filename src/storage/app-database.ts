import { getRandomBytesAsync } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import {
  configureDatabase,
  createDatabase,
  migrate,
  type Database,
} from './database';
import {
  getOrCreateDatabaseKey,
  pragmaKeyStatement,
  SQLCIPHER_KEY_SECRET,
} from './database-key';
import { createExpoSqliteDriver } from './expo-driver';
import { isUnrecoverableKeyError } from './recovery';
import { createSecureStoreBackend } from './secure-store-backend';

export const DATABASE_NAME = 'devgauge.db';

async function connectWithKey(key: string): Promise<Database> {
  const sqlite = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    // The key must be applied before any other statement.
    await sqlite.execAsync(pragmaKeyStatement(key));
    const db = createDatabase(createExpoSqliteDriver(sqlite));
    await configureDatabase(db);
    await migrate(db);
    return db;
  } catch (error) {
    await sqlite.closeAsync().catch(() => undefined);
    throw error;
  }
}

/**
 * Opens the encrypted local database. If the stored key no longer matches the
 * file (a restore without the Keystore-backed key), the unrecoverable cache is
 * discarded and a fresh database is created; provider reconnection repopulates
 * it. The key never leaves SecureStore.
 */
export async function openAppDatabase(): Promise<Database> {
  const secretStore = createSecureStoreBackend();
  const key = await getOrCreateDatabaseKey(secretStore, getRandomBytesAsync);
  try {
    return await connectWithKey(key);
  } catch (error) {
    if (!isUnrecoverableKeyError(error)) throw error;
    await SQLite.deleteDatabaseAsync(DATABASE_NAME).catch(() => undefined);
    await secretStore.delete(SQLCIPHER_KEY_SECRET);
    const freshKey = await getOrCreateDatabaseKey(
      secretStore,
      getRandomBytesAsync,
    );
    return connectWithKey(freshKey);
  }
}

/** Deletes the encrypted database file (used by delete-all recovery). */
export async function resetAppDatabaseFile(): Promise<void> {
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
}

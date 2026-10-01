import type { Database } from '@/storage/database';
import { withWriteTransaction } from '@/storage/write-transaction';
import { SQLCIPHER_KEY_SECRET } from '@/storage/database-key';
import {
  deleteConnection,
  getConnection,
  listConnections,
  markConnectionDisconnected,
} from '@/storage/repositories/connections';
import { cancelScheduledForConnection } from '@/storage/repositories/notifications';
import type { SecretStore } from '@/storage/secret-store';
import type { SecureVault } from '@/storage/secure-vault';

export type NotificationCanceller = {
  cancelForConnection(connectionId: string): Promise<void>;
  cancelAll(): Promise<void>;
};

export type LocalDataDependencies = {
  vault: SecureVault;
  secretStore: SecretStore;
  canceller?: NotificationCanceller;
  /** App runtime only: remove the encrypted database file after deletion. */
  resetDatabaseFile?: () => Promise<void>;
};

export type DisconnectOptions = {
  /** When true the connection row and its cascaded history are deleted. */
  deleteHistory: boolean;
  now: string;
};

export type DisconnectResult = {
  credentialRemoved: boolean;
  historyDeleted: boolean;
  schedulesCancelled: number;
};

/**
 * Deletes the stored credential, cancels scheduled notifications, and either
 * deletes the connection (cascading history) or marks it disconnected.
 */
export async function disconnectConnection(
  db: Database,
  deps: LocalDataDependencies,
  connectionId: string,
  options: DisconnectOptions,
): Promise<DisconnectResult> {
  const connection = await getConnection(db, connectionId);
  if (!connection) {
    return {
      credentialRemoved: false,
      historyDeleted: false,
      schedulesCancelled: 0,
    };
  }

  // Invalidate refresh writes before asynchronous native/credential cleanup.
  await withWriteTransaction(db, (tx) =>
    tx.run(
      "UPDATE provider_connections SET status='disconnected',disconnected_at=?,updated_at=? WHERE id=?",
      [options.now, options.now, connectionId],
    ),
  );
  let credentialRemoved = false;
  if (connection.credentialRef) {
    await deps.vault.remove(connection.credentialRef);
    credentialRemoved = true;
  }
  if (deps.canceller) {
    await deps.canceller.cancelForConnection(connectionId);
  }
  const schedulesCancelled = await cancelScheduledForConnection(
    db,
    connectionId,
    options.now,
  );

  if (options.deleteHistory) {
    await deleteConnection(db, connectionId);
  } else {
    await markConnectionDisconnected(db, connectionId, options.now);
  }

  return {
    credentialRemoved,
    historyDeleted: options.deleteHistory,
    schedulesCancelled,
  };
}

// Children before parents; cascade relationships are satisfied either way.
const DELETE_ORDER = [
  'cli_stats_imports',
  'usage_windows',
  'usage_snapshots',
  'refresh_attempts',
  'notification_operations',
  'scheduled_notifications',
  'notification_rules',
  'manual_reset_entries',
  'provider_connections',
  'app_settings',
] as const;

export type DeleteAllReport = {
  connections: number;
  credentialRefsRemoved: number;
  databaseKeyDeleted: boolean;
  notificationsCancelled: boolean;
  databaseFileReset: boolean;
};

/**
 * Deletes every local record, every stored credential, and the SQLCipher key.
 * Remote revocation is a connector concern (later phases) and is reported
 * separately by the caller.
 */
export async function deleteAllLocalData(
  db: Database,
  deps: LocalDataDependencies,
): Promise<DeleteAllReport> {
  const connections = await listConnections(db);
  let notificationsCancelled = false;
  if (deps.canceller) {
    await deps.canceller.cancelAll();
    notificationsCancelled = true;
  }
  let credentialRefsRemoved = 0;
  for (const connection of connections) {
    if (connection.credentialRef) {
      await deps.vault.remove(connection.credentialRef);
      credentialRefsRemoved += 1;
    }
  }

  await withWriteTransaction(db, async (tx) => {
    for (const table of DELETE_ORDER) {
      await tx.run(`DELETE FROM ${table}`);
    }
  });

  const storedKey = await deps.secretStore.get(SQLCIPHER_KEY_SECRET);
  const databaseKeyDeleted = storedKey !== null;
  let databaseFileReset = false;
  if (deps.resetDatabaseFile) {
    await deps.resetDatabaseFile();
    databaseFileReset = true;
  }
  // Keep the key if file removal fails, so the emptied database remains
  // readable and cleanup can be retried instead of relying on key-loss recovery.
  if (databaseKeyDeleted) {
    await deps.secretStore.delete(SQLCIPHER_KEY_SECRET);
  }

  return {
    connections: connections.length,
    credentialRefsRemoved,
    databaseKeyDeleted,
    notificationsCancelled,
    databaseFileReset,
  };
}

export type ClearCacheReport = { snapshotsDeleted: number };

/**
 * Removes cached usage snapshots (and their windows) but keeps connections,
 * credentials, and settings.
 */
export async function clearCachedUsage(
  db: Database,
): Promise<ClearCacheReport> {
  const result = await db.run('DELETE FROM usage_snapshots');
  return { snapshotsDeleted: result.changes };
}

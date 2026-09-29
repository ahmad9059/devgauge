import { openAppDatabase } from '@/storage/app-database';
import type { Database } from '@/storage/database';

let pending: Promise<Database> | null = null;

/**
 * Lazily opens the encrypted database once for the app runtime. A failure
 * resets the memo so a later attempt can retry, and callers fall back to
 * in-memory defaults rather than blocking the UI.
 */
export function getAppDatabase(): Promise<Database> {
  if (!pending) {
    pending = openAppDatabase().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

/**
 * Drops the cached handle so the next open re-runs migrations (and the
 * key-loss recovery path). Used after deleting all local data.
 */
export function resetAppDatabaseHandle(): void {
  pending = null;
}

/**
 * Detects the SQLCipher "wrong or missing key" failure. When the local key is
 * gone (for example after an Android restore) the encrypted cache is
 * unrecoverable, and the documented response is a destructive local reset
 * (DATABASE.md §2). Anything else must propagate and never silently wipe data.
 */
export function isUnrecoverableKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /file is not a database/i.test(message);
}

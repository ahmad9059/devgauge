import type { SecretStore } from './secret-store';

export const SQLCIPHER_KEY_SECRET = 'system.sqlcipher.key.v1';
export const SQLCIPHER_KEY_BYTES = 32;

export type RandomBytes = (length: number) => Promise<Uint8Array>;

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/** Exactly 32 bytes of lowercase hex, the SQLCipher raw-key form. */
export function isValidDatabaseKey(hex: string): boolean {
  return /^[0-9a-f]{64}$/.test(hex);
}

/**
 * SQLCipher does not accept bound parameters for `PRAGMA key`, so the raw key
 * is interpolated after strict validation. The key is generated locally and is
 * never user/provider input.
 */
export function pragmaKeyStatement(hex: string): string {
  if (!isValidDatabaseKey(hex)) {
    throw new Error('Refusing to apply a malformed SQLCipher key');
  }
  return `PRAGMA key = "x'${hex}'"`;
}

/** Reads the existing key or creates and persists a new random one. */
export async function getOrCreateDatabaseKey(
  store: SecretStore,
  randomBytes: RandomBytes,
): Promise<string> {
  const existing = await store.get(SQLCIPHER_KEY_SECRET);
  if (existing !== null) {
    if (!isValidDatabaseKey(existing)) {
      throw new Error('Stored SQLCipher key is malformed');
    }
    return existing;
  }
  const key = bytesToHex(await randomBytes(SQLCIPHER_KEY_BYTES));
  if (!isValidDatabaseKey(key)) {
    throw new Error('Generated SQLCipher key is malformed');
  }
  await store.set(SQLCIPHER_KEY_SECRET, key);
  return key;
}

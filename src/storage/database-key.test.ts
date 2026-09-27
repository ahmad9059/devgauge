import { describe, expect, it } from 'vitest';

import {
  bytesToHex,
  getOrCreateDatabaseKey,
  isValidDatabaseKey,
  pragmaKeyStatement,
  SQLCIPHER_KEY_SECRET,
} from '@/storage/database-key';
import { createMemorySecretStore } from '@/storage/secret-store';

const deterministicRandom = (length: number) =>
  Promise.resolve(new Uint8Array(Array.from({ length }, (_, index) => index)));

describe('SQLCipher key lifecycle', () => {
  it('creates and persists a 32-byte key, then reuses it', async () => {
    const store = createMemorySecretStore();
    const key = await getOrCreateDatabaseKey(store, deterministicRandom);

    expect(isValidDatabaseKey(key)).toBe(true);
    expect(key).toHaveLength(64);
    expect(store.entries()[SQLCIPHER_KEY_SECRET]).toBe(key);

    const again = await getOrCreateDatabaseKey(store, deterministicRandom);
    expect(again).toBe(key);
  });

  it('refuses to use a malformed stored key', async () => {
    const store = createMemorySecretStore({ [SQLCIPHER_KEY_SECRET]: 'zz' });
    await expect(
      getOrCreateDatabaseKey(store, deterministicRandom),
    ).rejects.toThrow(/malformed/);
  });

  it('builds a validated PRAGMA key statement', () => {
    const key = 'a'.repeat(64);
    expect(pragmaKeyStatement(key)).toBe(`PRAGMA key = "x'${key}'"`);
    expect(() => pragmaKeyStatement('short')).toThrow(/malformed/);
    expect(isValidDatabaseKey('A'.repeat(64))).toBe(false);
  });

  it('converts bytes to lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
  });
});

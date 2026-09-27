import { describe, expect, it } from 'vitest';

import {
  buildCredentialRef,
  createSecureVault,
  parseCredentialRef,
  validateCredentialRecord,
} from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';

const REF = buildCredentialRef('github-copilot', 'conn-1', 'oauth');

describe('credential refs', () => {
  it('builds and parses an opaque ref', () => {
    expect(REF).toBe('provider.github-copilot.connection.conn-1.oauth');
    expect(parseCredentialRef(REF)).toEqual({
      providerId: 'github-copilot',
      connectionId: 'conn-1',
      suffix: 'oauth',
    });
  });

  it('rejects malformed refs and dotted connection ids', () => {
    expect(parseCredentialRef('not-a-ref')).toBeNull();
    expect(() => buildCredentialRef('claude', 'a.b', 'oauth')).toThrow(/dots/);
  });
});

describe('credential records', () => {
  it('requires the credential that matches its kind', () => {
    expect(() =>
      validateCredentialRecord({ version: 1, kind: 'oauth' }),
    ).toThrow(/accessToken/);
    expect(() =>
      validateCredentialRecord({ version: 1, kind: 'api-key' }),
    ).toThrow(/apiKey/);
    expect(() =>
      validateCredentialRecord({ version: 2, kind: 'oauth' }),
    ).toThrow(/version/);
  });
});

describe('secure vault', () => {
  it('stores, loads, and removes a record', async () => {
    const store = createMemorySecretStore();
    const vault = createSecureVault(store);
    const record = {
      version: 1 as const,
      kind: 'oauth' as const,
      accessToken: 'access',
      refreshToken: 'refresh',
      grantedPermissions: ['read:usage'],
    };
    await vault.save(REF, record);
    expect(await vault.load(REF)).toEqual(record);

    await vault.remove(REF);
    expect(await vault.load(REF)).toBeNull();
    expect(store.size).toBe(0);
  });

  it('treats a corrupt record as absent and deletes it (fail closed)', async () => {
    const store = createMemorySecretStore({ [REF]: 'not-json' });
    const vault = createSecureVault(store);
    expect(await vault.load(REF)).toBeNull();
    expect(await store.get(REF)).toBeNull();
  });
});

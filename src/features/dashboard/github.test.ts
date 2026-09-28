import { describe, expect, it } from 'vitest';

import { createRefreshEngine } from '@/features/dashboard/refresh-connection';
import { disconnectConnection } from '@/services/local-data';
import { createGitHubCopilotAdapter } from '@/providers/github-copilot/adapter';
import { createProviderRegistry } from '@/providers/registry';
import {
  createHttpClient,
  type FetchResponseLike,
} from '@/services/network/client';
import {
  getConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');

function res(body: string): FetchResponseLike {
  return {
    status: 200,
    headers: {
      get: () => null,
      forEach: () => undefined,
    },
    text: async () => body,
  };
}

describe('github release gate', () => {
  it('never contacts the network while release-disabled', async () => {
    const db = await createMigratedTestDatabase();
    const vault = createSecureVault(createMemorySecretStore());
    let fetchCalls = 0;
    const registry = createProviderRegistry({
      'github-copilot': createGitHubCopilotAdapter({
        owner: 'octocat',
        scope: 'personal',
      }),
    });
    let counter = 0;
    const engine = createRefreshEngine({
      db,
      vault,
      registry,
      client: createHttpClient({
        fetchImpl: async () => {
          fetchCalls += 1;
          return res('{}');
        },
      }),
      nextId: () => `id-${(counter += 1)}`,
      clock: () => new Date(NOW),
    });
    await upsertConnection(
      db,
      makeConnection({
        id: 'g1',
        providerId: 'github-copilot',
        authMode: 'oauth-pkce',
        credentialRef: null,
      }),
    );

    const outcome = await engine.refresh('g1');
    expect(outcome).toEqual({
      status: 'skipped',
      connectionId: 'g1',
      reason: 'release-disabled',
    });
    expect(fetchCalls).toBe(0);
  });

  it('disconnect clears the stored github credential', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore();
    const vault = createSecureVault(store);
    const credentialRef = buildCredentialRef('github-copilot', 'g1', 'oauth');
    await upsertConnection(
      db,
      makeConnection({
        id: 'g1',
        providerId: 'github-copilot',
        authMode: 'oauth-pkce',
        credentialRef,
      }),
    );
    await vault.save(credentialRef, {
      version: 1,
      kind: 'oauth',
      accessToken: 'secret-token',
    });

    const result = await disconnectConnection(
      db,
      { vault, secretStore: store },
      'g1',
      { deleteHistory: false, now: NOW.toISOString() },
    );

    expect(result.credentialRemoved).toBe(true);
    expect(await store.get(credentialRef)).toBeNull();
    expect((await getConnection(db, 'g1'))?.status).toBe('disconnected');
  });
});

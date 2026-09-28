import { describe, expect, it } from 'vitest';

import { createRefreshEngine } from '@/features/dashboard/refresh-connection';
import { deleteAllLocalData } from '@/services/local-data';
import type { VendorContract } from '@/providers/experimental/contract';
import { createCommandCodeAdapter } from '@/providers/command-code/adapter';
import { commandCodeSuccessFixture } from '@/providers/command-code/fixtures';
import { createOpenCodeGoAdapter } from '@/providers/opencode-go/adapter';
import { openCodeGoSuccessFixture } from '@/providers/opencode-go/fixtures';
import { createProviderRegistry } from '@/providers/registry';
import {
  CAPABILITY_AUDIENCE,
  createCapabilityGate,
  type CapabilityManifest,
} from '@/services/capabilities/manifest';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import {
  getConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const MOCK_HOST = 'mock.vendor.test';

const commandCodeContract: VendorContract = {
  providerId: 'command-code',
  baseUrl: `https://${MOCK_HOST}`,
  usagePath: '/v1/usage',
  revocationUrl: `https://${MOCK_HOST}/keys`,
  allowedHosts: [MOCK_HOST],
  schemaVersion: 1,
  pollingLimitSeconds: 0,
  readOnly: true,
  distributionApproved: true,
  verifiedAt: '2026-09-28T00:00:00.000Z',
  sourceUrl: `https://${MOCK_HOST}/docs`,
};

const openCodeGoContract: VendorContract = {
  ...commandCodeContract,
  providerId: 'opencode-go',
  usagePath: '/zen/go/v1/usage',
};

function res(body: string, status = 200): FetchResponseLike {
  const map = new Map<string, string>();
  return {
    status,
    headers: {
      get: (name) => map.get(name.toLowerCase()) ?? null,
      forEach: (callback) => map.forEach((value, key) => callback(value, key)),
    },
    text: async () => body,
  };
}

function manifest(commandCodeEnabled: boolean): CapabilityManifest {
  return {
    version: 1,
    environment: 'production',
    audience: CAPABILITY_AUDIENCE,
    issuedAt: '2026-09-01T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
    providers: {
      'command-code': { enabled: commandCodeEnabled },
      'opencode-go': { enabled: true },
    },
  };
}

async function buildHarness(
  fetchImpl: FetchLike,
  options: { commandCodeEnabled?: boolean } = {},
) {
  const db = await createMigratedTestDatabase();
  const store = createMemorySecretStore();
  const vault = createSecureVault(store);
  const registry = createProviderRegistry({
    'command-code': createCommandCodeAdapter({ contract: commandCodeContract }),
    'opencode-go': createOpenCodeGoAdapter({ contract: openCodeGoContract }),
  });
  const capabilityGate = createCapabilityGate({
    manifest: manifest(options.commandCodeEnabled ?? true),
    appVersion: '1.0.0',
    now: () => new Date(NOW),
  });
  let counter = 0;
  const engine = createRefreshEngine({
    db,
    vault,
    registry,
    client: createHttpClient({ fetchImpl }),
    nextId: () => `id-${(counter += 1)}`,
    clock: () => new Date(NOW),
    capabilityGate,
  });

  async function addConnection(
    provider: 'command-code' | 'opencode-go',
    id: string,
  ) {
    const credentialRef = buildCredentialRef(provider, id, 'api-key');
    await upsertConnection(
      db,
      makeConnection({
        id,
        providerId: provider,
        authMode: 'api-key',
        credentialRef,
      }),
    );
    await vault.save(credentialRef, {
      version: 1,
      kind: 'api-key',
      apiKey: `key-${id}`,
    });
  }

  return { db, store, engine, addConnection };
}

describe('experimental connectors', () => {
  it('kill switch stops requests without preventing deletion', async () => {
    let calls = 0;
    const harness = await buildHarness(
      async () => {
        calls += 1;
        return res(commandCodeSuccessFixture());
      },
      { commandCodeEnabled: false },
    );
    await harness.addConnection('command-code', 'cc1');

    const outcome = await harness.engine.refresh('cc1', 'manual');
    expect(outcome).toEqual({
      status: 'skipped',
      connectionId: 'cc1',
      reason: 'capability-disabled',
    });
    expect(calls).toBe(0);

    const report = await deleteAllLocalData(harness.db, {
      vault: createSecureVault(harness.store),
      secretStore: harness.store,
    });
    expect(report.connections).toBe(1);
    expect(await getConnection(harness.db, 'cc1')).toBeNull();
  });

  it('preserves the last successful cache when a later refresh fails', async () => {
    let healthy = true;
    const harness = await buildHarness(async () =>
      healthy ? res(commandCodeSuccessFixture()) : res('{"nope":true}'),
    );
    await harness.addConnection('command-code', 'cc1');

    const first = await harness.engine.refresh('cc1', 'manual');
    expect(first.status).toBe('success');

    healthy = false;
    const second = await harness.engine.refresh('cc1', 'manual');
    expect(second.status).toBe('schema-changed');

    const cached = (await latestByConnection(harness.db)).get('cc1');
    expect(cached?.windows).toHaveLength(2);
    expect((await getConnection(harness.db, 'cc1'))?.status).toBe('error');
  });

  it('isolates one experimental provider failure from another', async () => {
    const harness = await buildHarness(async (url) =>
      url.includes('/zen/go/')
        ? res('', 503)
        : res(commandCodeSuccessFixture()),
    );
    await harness.addConnection('command-code', 'cc1');
    await harness.addConnection('opencode-go', 'og1');

    const outcomes = await harness.engine.refreshMany(
      ['cc1', 'og1'],
      'foreground',
    );
    const byConnection = Object.fromEntries(
      outcomes.map((outcome) => [outcome.connectionId, outcome.status]),
    );
    expect(byConnection.cc1).toBe('success');
    expect(byConnection.og1).toBe('transient-failure');
    const latest = await latestByConnection(harness.db);
    expect(latest.get('cc1')).toBeDefined();
    expect(latest.get('og1')).toBeUndefined();
  });

  it('records the vendor api-key never in SQLite', async () => {
    const harness = await buildHarness(async () =>
      res(openCodeGoSuccessFixture()),
    );
    await harness.addConnection('opencode-go', 'og1');
    await harness.engine.refresh('og1', 'manual');

    const rows = await harness.db.all<{ credential_ref: string | null }>(
      'SELECT credential_ref FROM provider_connections',
    );
    expect(rows[0]?.credential_ref).toContain('provider.opencode-go.');
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain('key-og1');
  });
});

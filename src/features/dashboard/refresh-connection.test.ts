import { describe, expect, it } from 'vitest';

import { createRefreshEngine } from '@/features/dashboard/refresh-connection';
import { createProviderRegistry } from '@/providers/registry';
import { createMockProviderAdapter } from '@/providers/mock/adapter';
import {
  partialFixture,
  schemaChangedFixture,
  successFixture,
} from '@/providers/mock/fixtures';
import { createCapabilityGate } from '@/services/capabilities/manifest';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import { upsertConnection } from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');

function res(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
): FetchResponseLike {
  const map = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    status,
    headers: {
      get: (name) => map.get(name.toLowerCase()) ?? null,
      forEach: (callback) => map.forEach((value, key) => callback(value, key)),
    },
    text: async () => body,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type RefreshHarnessOptions = {
  fetchImpl: FetchLike;
  ids?: string[];
  providerId?: 'claude';
  requiresCapabilityManifest?: boolean;
  capabilityGate?: ReturnType<typeof createCapabilityGate>;
  concurrency?: number;
};

async function buildHarness(options: RefreshHarnessOptions) {
  const db = await createMigratedTestDatabase();
  const store = createMemorySecretStore();
  const vault = createSecureVault(store);
  const registry = createProviderRegistry({
    claude: createMockProviderAdapter({
      id: options.providerId ?? 'claude',
      requiresCapabilityManifest: options.requiresCapabilityManifest ?? false,
    }),
  });
  let counter = 0;
  const nextId = () => options.ids?.shift() ?? `id-${(counter += 1)}`;
  let current = new Date(NOW);
  const engine = createRefreshEngine({
    db,
    vault,
    registry,
    client: createHttpClient({ fetchImpl: options.fetchImpl }),
    nextId,
    clock: () => current,
    concurrency: options.concurrency ?? 2,
    backoff: (attempt) => attempt * 1000,
    ...(options.capabilityGate
      ? { capabilityGate: options.capabilityGate }
      : {}),
  });

  async function addConnection(
    id: string,
    overrides: Record<string, unknown> = {},
  ) {
    const credentialRef = buildCredentialRef('claude', id, 'api-key');
    await upsertConnection(
      db,
      makeConnection({
        id,
        providerId: 'claude',
        authMode: 'api-key',
        credentialRef,
        ...overrides,
      }),
    );
    await vault.save(credentialRef, {
      version: 1,
      kind: 'api-key',
      apiKey: `key-${id}`,
    });
    return credentialRef;
  }

  return {
    db,
    vault,
    store,
    engine,
    addConnection,
    advance: (ms: number) => (current = new Date(current.getTime() + ms)),
  };
}

describe('refresh engine', () => {
  it('persists a successful snapshot and marks the connection connected', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res(successFixture()),
    });
    await harness.addConnection('c1');

    const outcome = await harness.engine.refresh('c1', 'manual');
    expect(outcome).toEqual({
      status: 'success',
      connectionId: 'c1',
      snapshotId: expect.any(String),
      windowCount: 2,
    });
    const snapshot = (await latestByConnection(harness.db)).get('c1');
    expect(snapshot?.windows).toHaveLength(2);
    expect(snapshot?.providerSchemaVersion).toBe(1);
    expect(snapshot?.windows[0].usedDecimal).toBe('42');
    expect(snapshot?.windows[0].remainingDecimal).toBe('58');
  });

  it('keeps unknown limits null end to end', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res(partialFixture()),
    });
    await harness.addConnection('c1');
    await harness.engine.refresh('c1');
    const window = (await latestByConnection(harness.db)).get('c1')?.windows[0];
    expect(window?.limitDecimal).toBeNull();
    expect(window?.remainingDecimal).toBeNull();
    expect(window?.utilization).toBeNull();
  });

  it('coalesces duplicate refreshes per connection', async () => {
    const gate = deferred<FetchResponseLike>();
    let calls = 0;
    const harness = await buildHarness({
      fetchImpl: async () => {
        calls += 1;
        return gate.promise;
      },
    });
    await harness.addConnection('c1');

    const first = harness.engine.refresh('c1', 'manual');
    const second = harness.engine.refresh('c1', 'manual');
    expect(harness.engine.activeCount()).toBe(1);
    gate.resolve(res(successFixture()));
    const [a, b] = await Promise.all([first, second]);
    expect(calls).toBe(1);
    expect(a).toEqual(b);
    expect(a.status).toBe('success');
  });

  it('limits global concurrency to two refreshes', async () => {
    let active = 0;
    let maxActive = 0;
    const harness = await buildHarness({
      concurrency: 2,
      fetchImpl: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return res(successFixture());
      },
    });
    await harness.addConnection('c1');
    await harness.addConnection('c2');
    await harness.addConnection('c3');

    await harness.engine.refreshMany(['c1', 'c2', 'c3'], 'startup');
    expect(maxActive).toBe(2);
  });

  it('fails one connection independently of another', async () => {
    const seen: string[] = [];
    const harness = await buildHarness({
      fetchImpl: async (_url, init) => {
        const authorization = init.headers?.Authorization ?? '';
        seen.push(authorization);
        return authorization.includes('key-c2')
          ? res('', 500)
          : res(successFixture());
      },
    });
    await harness.addConnection('c1');
    await harness.addConnection('c2');

    const outcomes = await harness.engine.refreshMany(
      ['c1', 'c2'],
      'foreground',
    );
    const byConnection = Object.fromEntries(
      outcomes.map((outcome) => [outcome.connectionId, outcome.status]),
    );
    expect(seen).toHaveLength(2);
    expect(byConnection.c1).toBe('success');
    expect(byConnection.c2).toBe('transient-failure');
    // c1's successful snapshot is persisted even though c2 failed.
    expect((await latestByConnection(harness.db)).get('c1')).toBeDefined();
    expect((await latestByConnection(harness.db)).get('c2')).toBeUndefined();
  });

  it('honors Retry-After and skips until it elapses', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res('', 429, { 'retry-after': '120' }),
    });
    await harness.addConnection('c1');

    const outcome = await harness.engine.refresh('c1', 'manual');
    expect(outcome).toMatchObject({ status: 'rate-limited' });
    const retryAt = (outcome as { retryAt: string }).retryAt;
    expect(retryAt).toBe(new Date(NOW.getTime() + 120_000).toISOString());

    const skipped = await harness.engine.refresh('c1', 'foreground');
    expect(skipped).toEqual({
      status: 'skipped',
      connectionId: 'c1',
      reason: 'not-yet-due',
    });
    harness.advance(121_000);
    const manual = await harness.engine.refresh('c1', 'manual');
    expect(manual.status).toBe('rate-limited');
  });

  it('maps auth failures to auth-expired', async () => {
    const harness = await buildHarness({ fetchImpl: async () => res('', 401) });
    await harness.addConnection('c1');
    const outcome = await harness.engine.refresh('c1');
    expect(outcome).toMatchObject({
      status: 'auth-expired',
      code: 'unauthorized',
    });
  });

  it('maps a changed schema to schema-changed and preserves cache', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res(schemaChangedFixture()),
    });
    await harness.addConnection('c1');
    const outcome = await harness.engine.refresh('c1');
    expect(outcome).toMatchObject({
      status: 'schema-changed',
      code: 'schema_changed',
    });
    expect((await latestByConnection(harness.db)).get('c1')).toBeUndefined();
  });

  it('applies jittered backoff to transient failures', async () => {
    const harness = await buildHarness({ fetchImpl: async () => res('', 503) });
    await harness.addConnection('c1');
    const outcome = await harness.engine.refresh('c1');
    expect(outcome).toMatchObject({
      status: 'transient-failure',
      code: 'provider_unavailable',
    });
    expect((outcome as { retryAt: string }).retryAt).toBe(
      new Date(NOW.getTime() + 1000).toISOString(),
    );
    const skipped = await harness.engine.refresh('c1', 'foreground');
    expect(skipped.status).toBe('skipped');
  });

  it('cancels an in-flight refresh', async () => {
    const gate = deferred<FetchResponseLike>();
    const harness = await buildHarness({
      fetchImpl: async (_url, init) => {
        init.signal.addEventListener('abort', () => gate.resolve(res('', 499)));
        return gate.promise;
      },
    });
    await harness.addConnection('c1');
    const pending = harness.engine.refresh('c1');
    harness.engine.cancel('c1');
    const outcome = await pending;
    expect(outcome.status).toBe('cancelled');
  });

  it('blocks an experimental connector when the capability gate denies it', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res(successFixture()),
      requiresCapabilityManifest: true,
      capabilityGate: createCapabilityGate({
        manifest: null,
        appVersion: '0.1.0',
      }),
    });
    await harness.addConnection('c1');
    const outcome = await harness.engine.refresh('c1');
    expect(outcome).toEqual({
      status: 'skipped',
      connectionId: 'c1',
      reason: 'capability-disabled',
    });
    const attempt = await harness.db.first<{ error_code: string }>(
      'SELECT error_code FROM refresh_attempts WHERE connection_id = ?',
      ['c1'],
    );
    expect(attempt?.error_code).toBe('capability_disabled');
  });

  it('skips a connection that has no live adapter', async () => {
    const harness = await buildHarness({
      fetchImpl: async () => res(successFixture()),
    });
    await upsertConnection(
      harness.db,
      makeConnection({
        id: 'c9',
        providerId: 'codex',
        authMode: 'manual',
        credentialRef: null,
      }),
    );
    const outcome = await harness.engine.refresh('c9');
    expect(outcome).toEqual({
      status: 'skipped',
      connectionId: 'c9',
      reason: 'no-live-adapter',
    });
  });
});

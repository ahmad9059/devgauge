import { describe, expect, it } from 'vitest';

import type { VendorContract } from '@/providers/experimental/contract';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import { makeConnection } from '@/testing/storage/factory';

import { createOpenCodeGoAdapter, openCodeGoDescriptor } from './adapter';
import {
  openCodeGoMalformedFixture,
  openCodeGoPartialFixture,
  openCodeGoSuccessFixture,
} from './fixtures';

const NOW = new Date('2026-09-28T00:00:00.000Z');

const contract: VendorContract = {
  providerId: 'opencode-go',
  baseUrl: 'https://mock.vendor.test',
  usagePath: '/zen/go/v1/usage',
  revocationUrl: 'https://mock.vendor.test/keys',
  allowedHosts: ['mock.vendor.test'],
  schemaVersion: 1,
  pollingLimitSeconds: 120,
  readOnly: true,
  distributionApproved: true,
  verifiedAt: '2026-09-28T00:00:00.000Z',
  sourceUrl: 'https://mock.vendor.test/docs',
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

function context(fetchImpl: FetchLike) {
  return {
    connection: makeConnection({
      id: 'og1',
      providerId: 'opencode-go',
      authMode: 'api-key',
      credentialRef: null,
    }),
    credential: { kind: 'api-key' as const, apiKey: 'key-xyz' },
    now: NOW,
    signal: new AbortController().signal,
    client: createHttpClient({ fetchImpl }),
  };
}

describe('opencode go connector', () => {
  it('makes no request without a verified contract', async () => {
    const adapter = createOpenCodeGoAdapter();
    expect(adapter.descriptor.capabilities.liveUsage).toBe(false);
    await expect(
      adapter.fetchUsage!(context(async () => res('{}'))),
    ).rejects.toMatchObject({ code: 'capability_disabled' });
  });

  it('preserves model-specific windows and currency', async () => {
    const adapter = createOpenCodeGoAdapter({ contract });
    const result = await adapter.fetchUsage!(
      context(async () => res(openCodeGoSuccessFixture())),
    );
    expect(result.windows.map((window) => window.unit)).toEqual([
      'percent',
      'currency',
    ]);
    expect(result.windows[0].externalKey).toContain('model:gpt-5');
    expect(result.windows[1].currencyCode).toBe('USD');
  });

  it('keeps unknown limits null', async () => {
    const adapter = createOpenCodeGoAdapter({ contract });
    const result = await adapter.fetchUsage!(
      context(async () => res(openCodeGoPartialFixture())),
    );
    expect(result.windows[0].limit).toBeNull();
  });

  it('fails safely on malformed and outage responses', async () => {
    const adapter = createOpenCodeGoAdapter({ contract });
    await expect(
      adapter.fetchUsage!(
        context(async () => res(openCodeGoMalformedFixture())),
      ),
    ).rejects.toMatchObject({ code: 'schema_changed' });
    await expect(
      adapter.fetchUsage!(context(async () => res('', 500))),
    ).rejects.toMatchObject({ code: 'provider_unavailable' });
    await expect(
      adapter.fetchUsage!(context(async () => res('', 401))),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('reports the unverified descriptor as release-disabled', () => {
    expect(openCodeGoDescriptor().capabilities.liveUsage).toBe(false);
    expect(openCodeGoDescriptor(contract).capabilities.liveUsage).toBe(true);
  });
});

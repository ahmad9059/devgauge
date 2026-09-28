import { describe, expect, it } from 'vitest';

import type { VendorContract } from '@/providers/experimental/contract';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import { makeConnection } from '@/testing/storage/factory';

import { commandCodeDescriptor, createCommandCodeAdapter } from './adapter';
import {
  commandCodeMalformedFixture,
  commandCodePartialFixture,
  commandCodeSuccessFixture,
} from './fixtures';

const NOW = new Date('2026-09-28T00:00:00.000Z');

const contract: VendorContract = {
  providerId: 'command-code',
  baseUrl: 'https://mock.vendor.test',
  usagePath: '/v1/usage',
  revocationUrl: 'https://mock.vendor.test/keys',
  allowedHosts: ['mock.vendor.test'],
  schemaVersion: 1,
  pollingLimitSeconds: 60,
  readOnly: true,
  distributionApproved: true,
  verifiedAt: '2026-09-28T00:00:00.000Z',
  sourceUrl: 'https://mock.vendor.test/docs',
};

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

function context(
  fetchImpl: FetchLike,
  credential: { kind: 'api-key'; apiKey: string } | { kind: 'none' } = {
    kind: 'api-key',
    apiKey: 'key-abc',
  },
) {
  return {
    connection: makeConnection({
      id: 'cc1',
      providerId: 'command-code',
      authMode: 'api-key',
      credentialRef: null,
    }),
    credential,
    now: NOW,
    signal: new AbortController().signal,
    client: createHttpClient({ fetchImpl }),
  };
}

describe('command code connector', () => {
  it('makes no request without a verified contract', async () => {
    const adapter = createCommandCodeAdapter();
    expect(adapter.descriptor.capabilities.liveUsage).toBe(false);
    expect(adapter.descriptor.allowlistedHosts).toEqual([]);
    expect(adapter.descriptor.requiresCapabilityManifest).toBe(true);
    await expect(
      adapter.fetchUsage!(context(async () => res('{}'))),
    ).rejects.toMatchObject({ code: 'capability_disabled' });
  });

  it('normalizes usage once the contract is verified', async () => {
    const adapter = createCommandCodeAdapter({ contract });
    expect(adapter.descriptor.capabilities.liveUsage).toBe(true);
    const result = await adapter.fetchUsage!(
      context(async () => res(commandCodeSuccessFixture())),
    );
    expect(result.windows).toHaveLength(2);
    expect(result.windows[0].used).toBe('12');
    expect(result.windows[0].remaining).toBe('38');
  });

  it('keeps unknown limits null and preserves partial data', async () => {
    const adapter = createCommandCodeAdapter({ contract });
    const result = await adapter.fetchUsage!(
      context(async () => res(commandCodePartialFixture())),
    );
    expect(result.isPartial).toBe(true);
    expect(result.windows[0].limit).toBeNull();
    expect(result.windows[0].utilization).toBeNull();
  });

  it('maps key, rate-limit, outage, and schema states', async () => {
    const adapter = createCommandCodeAdapter({ contract });
    await expect(
      adapter.fetchUsage!(context(async () => res('', 401))),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(
      adapter.fetchUsage!(context(async () => res('', 403))),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      adapter.fetchUsage!(
        context(async () => res('', 429, { 'retry-after': '60' })),
      ),
    ).rejects.toMatchObject({ code: 'rate_limited', retryAfterMs: 60_000 });
    await expect(
      adapter.fetchUsage!(context(async () => res('', 503))),
    ).rejects.toMatchObject({ code: 'provider_unavailable' });
    await expect(
      adapter.fetchUsage!(
        context(async () => res(commandCodeMalformedFixture())),
      ),
    ).rejects.toMatchObject({ code: 'schema_changed' });
  });

  it('maps a transport failure to offline', async () => {
    const adapter = createCommandCodeAdapter({ contract });
    const failing: FetchLike = async () => {
      throw new Error('socket closed');
    };
    await expect(adapter.fetchUsage!(context(failing))).rejects.toMatchObject({
      code: 'offline',
    });
  });

  it('requires an api-key credential', async () => {
    const adapter = createCommandCodeAdapter({ contract });
    await expect(
      adapter.fetchUsage!(
        context(async () => res(commandCodeSuccessFixture()), {
          kind: 'none',
        }),
      ),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('refuses a host outside the contract allowlist', async () => {
    const adapter = createCommandCodeAdapter({
      contract: { ...contract, allowedHosts: ['other.vendor.test'] },
    });
    await expect(
      adapter.fetchUsage!(
        context(async () => res(commandCodeSuccessFixture())),
      ),
    ).rejects.toMatchObject({ code: 'unknown' });
  });

  it('exposes no live usage in the unverified descriptor', () => {
    expect(commandCodeDescriptor().capabilities.liveUsage).toBe(false);
  });
});

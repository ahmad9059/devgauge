import { describe, expect, it } from 'vitest';

import { ProviderError } from '@/domain/errors';
import { createMockProviderAdapter } from '@/providers/mock/adapter';
import {
  currencyFixture,
  hostileFixture,
  notJsonFixture,
  oversizedFixture,
  partialFixture,
  schemaChangedFixture,
  successFixture,
} from '@/providers/mock/fixtures';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
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

function adapterWith(
  response: FetchResponseLike,
  seen?: { headers?: Record<string, string> },
) {
  const fetchImpl: FetchLike = async (_url, init) => {
    if (seen) seen.headers = init.headers;
    return response;
  };
  const client = createHttpClient({ fetchImpl });
  return createMockProviderAdapter({ id: 'claude' }).fetchUsage!({
    connection: makeConnection({ id: 'c1' }),
    credential: { kind: 'api-key', apiKey: 'test-key-value' },
    now: NOW,
    signal: new AbortController().signal,
    client,
  });
}

describe('mock adapter', () => {
  it('normalizes a success payload and derives remaining', async () => {
    const result = await adapterWith(res(successFixture()));
    expect(result.windows).toHaveLength(2);
    const fiveHour = result.windows[0];
    expect(fiveHour.used).toBe('42');
    expect(fiveHour.limit).toBe('100');
    expect(fiveHour.remaining).toBe('58');
    expect(fiveHour.utilization).toBeCloseTo(0.42);
    expect(result.identity?.displayName).toBe('Mock account');
    expect(result.isPartial).toBe(false);
  });

  it('keeps an absent limit null and flags partial data', async () => {
    const result = await adapterWith(res(partialFixture()));
    const window = result.windows[0];
    expect(window.limit).toBeNull();
    expect(window.remaining).toBeNull();
    expect(window.utilization).toBeNull();
    expect(result.isPartial).toBe(true);
  });

  it('preserves currency precision and code', async () => {
    const result = await adapterWith(res(currencyFixture()));
    expect(result.windows[0].used).toBe('18.5');
    expect(result.windows[0].currencyCode).toBe('USD');
  });

  it('sends an api-key credential as an authorization header', async () => {
    const seen: { headers?: Record<string, string> } = {};
    await adapterWith(res(successFixture()), seen);
    expect(seen.headers?.Authorization).toBe('Bearer test-key-value');
  });

  it('fails a changed schema safely without throwing raw content', async () => {
    await expect(
      adapterWith(res(schemaChangedFixture())),
    ).rejects.toMatchObject({
      code: 'schema_changed',
    });
    await expect(adapterWith(res(notJsonFixture()))).rejects.toMatchObject({
      code: 'schema_changed',
    });
  });

  it('keeps hostile label text but does not alter control flow', async () => {
    const result = await adapterWith(res(hostileFixture()));
    expect(result.windows[0].label).toContain('<script>');
    expect(result.windows[0].used).toBe('5');
  });

  it('fails oversized responses safely', async () => {
    await expect(adapterWith(res(oversizedFixture()))).rejects.toMatchObject({
      code: 'schema_changed',
    });
  });

  it('maps auth, rate-limit, and server errors to provider codes', async () => {
    await expect(adapterWith(res('', 401))).rejects.toMatchObject({
      code: 'unauthorized',
    });
    await expect(adapterWith(res('', 403))).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(adapterWith(res('', 500))).rejects.toMatchObject({
      code: 'provider_unavailable',
    });
    try {
      await adapterWith(res('', 429, { 'retry-after': '120' }));
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe('rate_limited');
      expect((error as ProviderError).retryAfterMs).toBe(120_000);
    }
  });

  it('refuses a host outside its allowlist', async () => {
    const client = createHttpClient({
      fetchImpl: async () => res(successFixture()),
    });
    const adapter = createMockProviderAdapter({
      id: 'claude',
      allowlistedHosts: ['other.devgauge.test'],
    });
    await expect(
      adapter.fetchUsage!({
        connection: makeConnection({ id: 'c1' }),
        credential: { kind: 'none' },
        now: NOW,
        signal: new AbortController().signal,
        client,
      }),
    ).rejects.toMatchObject({ code: 'unknown' });
  });
});

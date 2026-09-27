import { describe, expect, it } from 'vitest';

import {
  createHttpClient,
  isHostAllowed,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';

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

function clientReturning(response: FetchResponseLike) {
  return createHttpClient({ fetchImpl: async () => response });
}

describe('http client policy', () => {
  it('returns a response from an allowlisted https host', async () => {
    const client = clientReturning(
      res('{"ok":true}', 200, { 'x-request-id': 'r1' }),
    );
    const response = await client.get({
      url: 'https://api.devgauge.test/usage',
      allowHosts: ['devgauge.test'],
    });
    expect(response.status).toBe(200);
    expect(response.body).toBe('{"ok":true}');
    expect(response.headers['x-request-id']).toBe('r1');
  });

  it('refuses non-https and disallowed hosts', async () => {
    const client = clientReturning(res('x'));
    await expect(
      client.get({
        url: 'http://devgauge.test/x',
        allowHosts: ['devgauge.test'],
      }),
    ).rejects.toMatchObject({ code: 'insecure-url' });
    await expect(
      client.get({ url: 'https://evil.test/x', allowHosts: ['devgauge.test'] }),
    ).rejects.toMatchObject({ code: 'blocked-host' });
    await expect(
      client.get({
        url: 'https://devgauge.test:8443/x',
        allowHosts: ['devgauge.test'],
      }),
    ).rejects.toMatchObject({ code: 'blocked-host' });
    await expect(
      client.get({
        url: 'https://u:p@devgauge.test/x',
        allowHosts: ['devgauge.test'],
      }),
    ).rejects.toMatchObject({ code: 'blocked-host' });
  });

  it('allows subdomains of an allowlisted host', async () => {
    expect(
      isHostAllowed(new URL('https://api.devgauge.test/x'), ['devgauge.test']),
    ).toBe(true);
    expect(
      isHostAllowed(new URL('https://devgauge.test.evil.test'), [
        'devgauge.test',
      ]),
    ).toBe(false);
  });

  it('does not follow redirects', async () => {
    const client = clientReturning(
      res('', 302, { location: 'https://evil.test' }),
    );
    await expect(
      client.get({
        url: 'https://devgauge.test/x',
        allowHosts: ['devgauge.test'],
      }),
    ).rejects.toMatchObject({ code: 'redirect' });
  });

  it('rejects oversized responses by declared length and by body size', async () => {
    const declared = clientReturning(
      res('x', 200, { 'content-length': '999999' }),
    );
    await expect(
      declared.get({
        url: 'https://devgauge.test/x',
        allowHosts: ['devgauge.test'],
        maxBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'response-too-large' });

    const body = clientReturning(res('a'.repeat(200)));
    await expect(
      body.get({
        url: 'https://devgauge.test/x',
        allowHosts: ['devgauge.test'],
        maxBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'response-too-large' });
  });

  it('times out a stalled request', async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      });
    const client = createHttpClient({ fetchImpl, timeoutMs: 10 });
    await expect(
      client.get({
        url: 'https://devgauge.test/x',
        allowHosts: ['devgauge.test'],
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('honors external cancellation', async () => {
    const controller = new AbortController();
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      });
    const client = createHttpClient({ fetchImpl, timeoutMs: 5000 });
    const pending = client.get({
      url: 'https://devgauge.test/x',
      allowHosts: ['devgauge.test'],
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
  });
});

import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { createSyncBridgeScript, refreshSessionScript } from './bridge-script';

function browser() {
  const messages: { type: string; runId?: number; body?: string }[] = [];
  let utilization = 0.1;
  const fetch = vi.fn(async (input: string | Request, _init?: RequestInit) => ({
    url: typeof input === 'string' ? input : input.url,
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    clone: () => ({
      text: async () => JSON.stringify({ five_hour: { utilization } }),
    }),
  }));
  class XHR {
    open() {}
    send() {}
    setRequestHeader() {}
    addEventListener() {}
  }
  const window = {
    fetch,
    addEventListener: vi.fn(),
    ReactNativeWebView: {
      postMessage: (message: string) => messages.push(JSON.parse(message)),
    },
  };
  const context = {
    window,
    location: {
      href: 'https://claude.ai/settings/usage',
      origin: 'https://claude.ai',
    },
    document: {
      readyState: 'loading',
      addEventListener: vi.fn(),
      body: { innerText: 'stale quota text' },
    },
    XMLHttpRequest: XHR,
    Request,
    Headers,
    URL,
    Map,
    Set,
    setTimeout: vi.fn(),
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
  };
  return {
    context,
    messages,
    fetch,
    setUtilization: (value: number) => {
      utilization = value;
    },
  };
}

async function flush() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('warm website quota refresh', () => {
  it('does not clone unrelated, non-JSON, oversized or inactive responses', async () => {
    const page = browser();
    runInNewContext(createSyncBridgeScript(1), page.context);
    const clone = vi.fn(() => ({ text: async () => '{}' }));
    for (const [url, contentType, length] of [
      ['https://claude.ai/api/settings', 'application/json', '20'],
      ['https://other.test/api/usage', 'application/json', '20'],
      ['https://claude.ai/api/usage', 'text/html', '20'],
      ['https://claude.ai/api/usage', 'application/json', '250000'],
    ]) {
      page.fetch.mockResolvedValueOnce({
        url,
        ok: true,
        headers: new Headers({
          'content-type': contentType,
          'content-length': length,
        }),
        clone,
      });
      await page.context.window.fetch(url);
    }
    runInNewContext('window.__devgaugeStopCapture();', page.context);
    await page.context.window.fetch('https://claude.ai/api/usage');
    await flush();
    expect(clone).not.toHaveBeenCalled();
    expect(page.messages).toEqual([]);
  });
  it('fetches approved quota requests with fresh data and existing page auth, without reading old DOM', async () => {
    const page = browser();
    runInNewContext(createSyncBridgeScript(1), page.context);
    await page.context.window.fetch('https://claude.ai/api/usage', {
      headers: { Authorization: 'test-session' },
    });
    await flush();
    runInNewContext(
      "window.__devgaugeApproveQuotaUrl('https://claude.ai/api/usage'); window.__devgaugeCaptureActive = false;",
      page.context,
    );
    page.setUtilization(0.2);
    runInNewContext(refreshSessionScript(2), page.context);
    await flush();
    const fresh = page.messages.filter((message) => message.runId === 2);
    expect(fresh).toHaveLength(1);
    expect(JSON.parse(fresh[0].body!).five_hour.utilization).toBe(0.2);
    expect(fresh[0].type).toBe('usage');
    const request = page.fetch.mock.calls[1][0] as Request;
    expect(request.cache).toBe('no-store');
    expect(request.credentials).toBe('include');
    expect(request.headers.get('Authorization')).toBe('test-session');
    expect(JSON.stringify(page.messages)).not.toContain('test-session');
  });

  it('falls back when no approved read-only request exists', async () => {
    const page = browser();
    runInNewContext(createSyncBridgeScript(1), page.context);
    runInNewContext(refreshSessionScript(2), page.context);
    expect(page.messages).toEqual([{ type: 'fast-miss', runId: 2 }]);
    expect(page.fetch).not.toHaveBeenCalled();
  });

  it('tags late responses with their original attempt rather than the new sync', async () => {
    const page = browser();
    let release!: (response: Awaited<ReturnType<typeof page.fetch>>) => void;
    const response = new Promise<Awaited<ReturnType<typeof page.fetch>>>(
      (resolve) => {
        release = resolve;
      },
    );
    page.fetch.mockReturnValueOnce(response);
    runInNewContext(createSyncBridgeScript(1), page.context);
    const request = page.context.window.fetch('https://claude.ai/api/usage');
    runInNewContext(createSyncBridgeScript(2), page.context);
    release({
      url: 'https://claude.ai/api/usage',
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      clone: () => ({
        text: async () => JSON.stringify({ five_hour: { utilization: 0.1 } }),
      }),
    });
    await request;
    await flush();
    expect(page.messages[0].runId).toBe(1);
    expect(page.messages.some((message) => message.runId === 2)).toBe(false);
  });

  it('never replays mutations or requests to another origin', async () => {
    const page = browser();
    runInNewContext(createSyncBridgeScript(1), page.context);
    await page.context.window.fetch('https://claude.ai/api/usage', {
      method: 'POST',
    });
    await page.context.window.fetch('https://other.test/usage');
    await flush();
    runInNewContext(
      "window.__devgaugeApproveQuotaUrl('https://claude.ai/api/usage'); window.__devgaugeApproveQuotaUrl('https://other.test/usage');",
      page.context,
    );
    runInNewContext(refreshSessionScript(2), page.context);
    expect(page.messages.at(-1)).toEqual({ type: 'fast-miss', runId: 2 });
    expect(page.fetch).toHaveBeenCalledTimes(2);
  });
});

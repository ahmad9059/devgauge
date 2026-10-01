import { describe, expect, it } from 'vitest';

import {
  buildAuthorizeUrl,
  extractAuthCode,
  parseCallbackUrl,
  parseTokenResponse,
  tokenExchangeBody,
} from '@/providers/antigravity/oauth';
import {
  antigravityGroupOf,
  extractDefaultTierId,
  extractIneligibleReason,
  extractPlan,
  extractProjectId,
  loadAntigravityQuota,
  mergeAntigravityWindows,
  parseGroupedQuota,
  parseQuotaSummary,
  type AntigravityFetch,
  type AntigravityDiscovery,
} from '@/providers/antigravity/quota';

// The real values are injected from a gitignored .env at build time.
process.env.EXPO_PUBLIC_ANTIGRAVITY_CLIENT_ID = 'test-client-id';
process.env.EXPO_PUBLIC_ANTIGRAVITY_CLIENT_SECRET = 'test-secret';

describe('antigravity oauth', () => {
  it('builds the Google authorize URL with PKCE and required scopes', () => {
    const url = buildAuthorizeUrl({ challenge: 'CH', state: 'ST' });
    expect(url).toContain('accounts.google.com/o/oauth2/auth');
    expect(url).toContain('code_challenge=CH');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain(
      'redirect_uri=https%3A%2F%2Fantigravity.google%2Foauth-callback',
    );
    expect(url).toContain('aicode');
    expect(url).toContain('client_id=');
  });

  it('parses a success and an error callback', () => {
    expect(
      parseCallbackUrl(
        'https://antigravity.google/oauth-callback?code=abc&state=ST',
      ),
    ).toEqual({ kind: 'code', code: 'abc' });
    expect(
      parseCallbackUrl(
        'https://antigravity.google/oauth-callback?error=denied',
      ),
    ).toEqual({ kind: 'error', error: 'denied' });
    expect(
      parseCallbackUrl('https://evil.test/oauth-callback?code=x'),
    ).toBeNull();
  });

  it('accepts a bare code, a full URL, or a query fragment', () => {
    expect(extractAuthCode('4/0AbC-_.~xyz')).toBe('4/0AbC-_.~xyz');
    expect(
      extractAuthCode(
        'https://antigravity.google/oauth-callback?code=4%2F0AbC&state=ST',
      ),
    ).toBe('4/0AbC');
    expect(extractAuthCode('code=4/0AbC&state=ST')).toBe('4/0AbC');
    expect(extractAuthCode('')).toBeNull();
    expect(extractAuthCode('error=access_denied')).toBeNull();
    expect(extractAuthCode('not a code')).toBeNull();
  });

  it('encodes the token exchange body with the client secret', () => {
    const body = tokenExchangeBody({ code: 'c', verifier: 'v' });
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=c');
    expect(body).toContain('code_verifier=v');
    expect(body).toContain('client_secret=');
  });

  it('validates the token response', () => {
    expect(parseTokenResponse({ access_token: 't' }).accessToken).toBe('t');
    expect(() => parseTokenResponse({})).toThrow();
  });
});

describe('antigravity quota groups', () => {
  it('classifies model ids into the two shared pools', () => {
    expect(antigravityGroupOf('gemini-3-pro-high')).toBe('gemini');
    expect(antigravityGroupOf('claude-opus-4-6-thinking')).toBe('claude-gpt');
    expect(antigravityGroupOf('gpt-oss-120b-medium')).toBe('claude-gpt');
    expect(antigravityGroupOf('chat_20706')).toBeNull();
  });

  it('collapses per-model quotas into 5-hour pool windows', () => {
    const windows = parseGroupedQuota({
      models: {
        'gemini-3-pro': {
          quotaInfo: {
            remainingFraction: 0.4,
            resetTime: '2026-02-01T00:00:00Z',
          },
        },
        'gemini-3-flash': { quotaInfo: { remainingFraction: 0.8 } },
        'claude-sonnet-4-5': { quotaInfo: { remainingFraction: 0.9 } },
        chat_20706: { quotaInfo: { remainingFraction: 0.5 } },
      },
    });
    const byKey = Object.fromEntries(windows.map((w) => [w.externalKey, w]));
    expect(Object.keys(byKey).sort()).toEqual([
      'antigravity.claude-gpt.five-hour',
      'antigravity.gemini.five-hour',
    ]);
    expect(byKey['antigravity.gemini.five-hour'].used).toBe('60');
    expect(byKey['antigravity.gemini.five-hour'].resetsAt).toBe(
      '2026-02-01T00:00:00Z',
    );
    expect(byKey['antigravity.claude-gpt.five-hour'].used).toBe('10');
    expect(byKey['antigravity.gemini.five-hour'].label).toBe('5-hour limit');
  });

  it('does not mislabel a long-reset legacy model quota as weekly', () => {
    const windows = parseGroupedQuota({
      buckets: [
        {
          modelId: 'gemini-3-pro',
          remainingFraction: 0.5,
          resetTime: '2099-01-01T00:00:00Z',
          tokenType: 'WEEKLY',
        },
      ],
    });
    expect(windows.map((w) => w.externalKey)).toEqual([
      'antigravity.gemini.five-hour',
    ]);
  });

  it('reads both windows from the actual pooled quota summary', () => {
    const windows = parseQuotaSummary({
      groups: [
        {
          displayName: 'Gemini models',
          buckets: [
            {
              bucketId: 'gemini-5h',
              remainingFraction: 0.75,
              resetTime: '2026-10-01T03:00:00Z',
            },
            {
              bucketId: 'gemini-weekly',
              remainingFraction: 0.9999,
              resetTime: '2026-10-06T00:00:00Z',
            },
          ],
        },
        {
          buckets: [
            { bucketId: '3p-5h', remainingFraction: 0.4 },
            { bucketId: '3p-weekly', remainingFraction: 1 },
          ],
        },
      ],
    });
    expect(
      Object.fromEntries(windows?.map((w) => [w.externalKey, w.used]) ?? []),
    ).toEqual({
      'antigravity.gemini.five-hour': '25',
      'antigravity.gemini.weekly': '0.01',
      'antigravity.claude-gpt.five-hour': '60',
      'antigravity.claude-gpt.weekly': '0',
    });
    expect(windows?.find((w) => w.kind === 'weekly')?.resetsAt).toBe(
      '2026-10-06T00:00:00Z',
    );
  });

  it('accepts a wrapped summary and skips unknown/missing buckets without guessing', () => {
    const windows = parseQuotaSummary({
      response: {
        groups: [
          {
            buckets: [
              { bucketId: 'gemini-5h', remainingFraction: 0.5 },
              { bucketId: 'gemini-weekly' },
              { bucketId: 'gemini-image-weekly', remainingFraction: 0.1 },
              { bucketId: '3p-weekly', remainingFraction: 0.6 },
              null,
            ],
          },
        ],
      },
    });
    expect(windows?.map((w) => w.externalKey)).toEqual([
      'antigravity.gemini.five-hour',
      'antigravity.claude-gpt.weekly',
    ]);
    expect(parseQuotaSummary({ groups: [] })).toEqual([]);
    expect(parseQuotaSummary({ buckets: [] })).toBeNull();
  });

  it('merges windows from multiple payloads keeping the worst reading', () => {
    const a = parseGroupedQuota({
      models: { 'gemini-3-pro': { quotaInfo: { remainingFraction: 0.9 } } },
    });
    const b = parseGroupedQuota({
      models: { 'gemini-3-pro': { quotaInfo: { remainingFraction: 0.4 } } },
    });
    const merged = mergeAntigravityWindows([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].used).toBe('60');
  });

  it('extracts the project id, plan, and onboarding tier', () => {
    expect(extractProjectId({ cloudaicompanionProject: 'proj-1' })).toBe(
      'proj-1',
    );
    expect(
      extractProjectId({ cloudaicompanionProject: { id: 'proj-2' } }),
    ).toBe('proj-2');
    expect(extractProjectId({})).toBeNull();
    expect(extractPlan({ currentTier: { name: 'Free' } })).toBe('Free');
    expect(extractPlan({ planInfo: { planType: 'STANDARD' } })).toBe(
      'STANDARD',
    );
    expect(
      extractDefaultTierId({
        allowedTiers: [{ id: 'free-tier', isDefault: true }],
      }),
    ).toBe('free-tier');
    expect(extractDefaultTierId({ allowedTiers: [{ id: 'x' }] })).toBeNull();
    expect(
      extractIneligibleReason({
        ineligibleTiers: [{ reasonMessage: 'Not eligible' }],
      }),
    ).toBe('Not eligible');
  });
});

describe('loadAntigravityQuota', () => {
  it('caches project discovery and the working summary host for the scoped caller', async () => {
    const calls: string[] = [];
    const discovery: AntigravityDiscovery = {
      projectId: null,
      plan: null,
      summaryEndpoint: null,
      expiresAt: 0,
    };
    const fetchImpl: AntigravityFetch = async (url) => {
      calls.push(url);
      if (url.includes('loadCodeAssist'))
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'managed-test' }),
        );
      if (url.startsWith('https://daily-'))
        return new Response('', { status: 404 });
      return new Response(
        JSON.stringify({
          groups: [
            {
              buckets: [{ bucketId: 'gemini-weekly', remainingFraction: 0.3 }],
            },
          ],
        }),
      );
    };
    await loadAntigravityQuota('token', fetchImpl, {
      discovery,
      now: () => 1000,
    });
    expect(calls).toHaveLength(3);
    calls.length = 0;
    await loadAntigravityQuota('new-access-token', fetchImpl, {
      discovery,
      now: () => 2000,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain('daily-');
    calls.length = 0;
    await loadAntigravityQuota('token', fetchImpl, {
      discovery,
      now: () => 1000 + 86400001,
    });
    expect(calls.some((url) => url.includes('loadCodeAssist'))).toBe(true);
  });
  it('never onboards during ordinary refresh', async () => {
    const calls: string[] = [];
    const quota = await loadAntigravityQuota(
      'token',
      async (url) => {
        calls.push(url);
        return new Response(
          JSON.stringify({
            allowedTiers: [{ id: 'free-tier', isDefault: true }],
          }),
        );
      },
      { allowOnboarding: false },
    );
    expect(calls).toHaveLength(1);
    expect(quota.windows).toEqual([]);
    expect(quota.detail).toContain('reconnect');
  });
  it('starts independent fallback model and quota reads together', async () => {
    let started = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const quota = await loadAntigravityQuota('token', async (url) => {
      if (url.includes('loadCodeAssist'))
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'managed-test' }),
        );
      if (url.includes('retrieveUserQuotaSummary'))
        return new Response('', { status: 404 });
      started++;
      if (started === 2) release();
      await gate;
      return new Response(
        JSON.stringify({
          models: { 'gemini-3-pro': { quotaInfo: { remainingFraction: 0.5 } } },
        }),
      );
    });
    expect(started).toBe(2);
    expect(quota.windows[0].used).toBe('50');
  });
  it('onboards an account and prefers the pooled summary over legacy endpoints', async () => {
    const calls: string[] = [];
    const fetchImpl: AntigravityFetch = async (url) => {
      calls.push(url);
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({
            allowedTiers: [{ id: 'free-tier', isDefault: true }],
          }),
          { status: 200 },
        );
      }
      if (url.includes('onboardUser')) {
        return new Response(
          JSON.stringify({
            done: true,
            response: { cloudaicompanionProject: { id: 'managed-1' } },
          }),
          { status: 200 },
        );
      }
      if (url.includes('retrieveUserQuotaSummary')) {
        return new Response(
          JSON.stringify({
            groups: [
              {
                buckets: [
                  { bucketId: 'gemini-5h', remainingFraction: 0.4 },
                  { bucketId: 'gemini-weekly', remainingFraction: 0.9 },
                  { bucketId: '3p-5h', remainingFraction: 1 },
                  { bucketId: '3p-weekly', remainingFraction: 0.25 },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error('legacy endpoint should not be requested');
    };

    const quota = await loadAntigravityQuota('token', fetchImpl, {
      sleep: async () => {},
    });
    expect(quota.projectId).toBe('managed-1');
    expect(calls.some((url) => url.includes('onboardUser'))).toBe(true);
    expect(calls.some((url) => url.includes('retrieveUserQuotaSummary'))).toBe(
      true,
    );
    expect(calls.some((url) => url.includes('fetchAvailableModels'))).toBe(
      false,
    );
    const byKey = Object.fromEntries(
      quota.windows.map((w) => [w.externalKey, w.used]),
    );
    expect(byKey['antigravity.gemini.five-hour']).toBe('60');
    expect(byKey['antigravity.claude-gpt.weekly']).toBe('75');
    expect(byKey['antigravity.gemini.weekly']).toBe('10');
  });

  it('falls back to 5-hour only when the summary endpoint is unavailable', async () => {
    const fetchImpl: AntigravityFetch = async (url) => {
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'managed-1' }),
          { status: 200 },
        );
      }
      if (url.includes('retrieveUserQuotaSummary'))
        return new Response('', { status: 404 });
      if (url.includes('fetchAvailableModels')) {
        return new Response(
          JSON.stringify({
            models: {
              'gemini-3-pro': { quotaInfo: { remainingFraction: 0.5 } },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          buckets: [
            {
              modelId: 'claude-opus-4-6',
              remainingFraction: 0.75,
              resetTime: '2099-01-01T00:00:00Z',
            },
          ],
        }),
        { status: 200 },
      );
    };
    const quota = await loadAntigravityQuota('token', fetchImpl);
    expect(quota.windows.map((w) => w.externalKey)).toEqual([
      'antigravity.claude-gpt.five-hour',
      'antigravity.gemini.five-hour',
    ]);
    expect(quota.detail).toContain('5-hour only');
  });

  it('tries the production summary host when the daily host is unavailable', async () => {
    const calls: string[] = [];
    const fetchImpl: AntigravityFetch = async (url, init) => {
      calls.push(url);
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'managed-1' }),
          { status: 200 },
        );
      }
      if (url.startsWith('https://daily-'))
        return new Response('', { status: 404 });
      expect(init.body).toBe('{}');
      return new Response(
        JSON.stringify({
          response: {
            groups: [
              {
                buckets: [
                  { bucketId: 'gemini-weekly', remainingFraction: 0.3 },
                ],
              },
            ],
          },
        }),
        { status: 200 },
      );
    };
    const quota = await loadAntigravityQuota('token', fetchImpl);
    expect(quota.windows.map((w) => w.externalKey)).toEqual([
      'antigravity.gemini.weekly',
    ]);
    expect(
      calls.filter((url) => url.includes('retrieveUserQuotaSummary')),
    ).toHaveLength(2);
  });

  it('reports ineligible accounts without a project', async () => {
    const fetchImpl: AntigravityFetch = async () =>
      new Response(
        JSON.stringify({
          ineligibleTiers: [{ reasonMessage: 'Account not eligible' }],
        }),
        { status: 200 },
      );
    const quota = await loadAntigravityQuota('token', fetchImpl);
    expect(quota.windows).toEqual([]);
    expect(quota.detail).toBe('Account not eligible');
  });
});

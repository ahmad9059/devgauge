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
  type AntigravityFetch,
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

  it('collapses per-model quotas into pool hourly/weekly windows', () => {
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

  it('splits weekly from hourly using token type or reset distance', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    const windows = parseGroupedQuota(
      {
        buckets: [
          {
            modelId: 'gemini-3-pro',
            remainingFraction: 0.5,
            resetTime: '2026-01-05T00:00:00Z',
          },
          {
            modelId: 'gemini-3-pro',
            remainingFraction: 0.2,
            resetTime: '2026-01-01T03:00:00Z',
          },
          {
            modelId: 'claude-opus-4-6',
            remainingFraction: 0.1,
            tokenType: 'WEEKLY',
          },
        ],
      },
      now,
    );
    const byKey = Object.fromEntries(
      windows.map((w) => [w.externalKey, w.used]),
    );
    expect(byKey['antigravity.gemini.weekly']).toBe('50');
    expect(byKey['antigravity.gemini.five-hour']).toBe('80');
    expect(byKey['antigravity.claude-gpt.weekly']).toBe('90');
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
  it('onboards an account without a project, then loads pooled windows', async () => {
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
      if (url.includes('fetchAvailableModels')) {
        return new Response(
          JSON.stringify({
            models: {
              'gemini-3-pro': { quotaInfo: { remainingFraction: 0.4 } },
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
              remainingFraction: 0.25,
              tokenType: 'WEEKLY',
            },
          ],
        }),
        { status: 200 },
      );
    };

    const quota = await loadAntigravityQuota('token', fetchImpl, {
      sleep: async () => {},
    });
    expect(quota.projectId).toBe('managed-1');
    expect(calls.some((url) => url.includes('onboardUser'))).toBe(true);
    const byKey = Object.fromEntries(
      quota.windows.map((w) => [w.externalKey, w.used]),
    );
    expect(byKey['antigravity.gemini.five-hour']).toBe('60');
    expect(byKey['antigravity.claude-gpt.weekly']).toBe('75');
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

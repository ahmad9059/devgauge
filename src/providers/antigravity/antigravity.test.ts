import { describe, expect, it } from 'vitest';

import {
  buildAuthorizeUrl,
  extractAuthCode,
  parseCallbackUrl,
  parseTokenResponse,
  tokenExchangeBody,
} from '@/providers/antigravity/oauth';
import {
  extractDefaultTierId,
  extractIneligibleReason,
  extractPlan,
  extractProjectId,
  loadAntigravityQuota,
  parseQuotaPayload,
  type AntigravityFetch,
} from '@/providers/antigravity/quota';

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

describe('antigravity quota parsing', () => {
  it('maps quota buckets to used-percent windows', () => {
    const windows = parseQuotaPayload({
      buckets: [
        {
          modelId: 'gemini-pro',
          remainingFraction: 1,
          resetTime: '2026-01-01T00:00:00.000Z',
        },
        { modelId: 'gemini-flash', remainingFraction: 0.5 },
        { modelId: 'claude', remainingFraction: 0.25 },
      ],
    });
    const byLabel = Object.fromEntries(windows.map((w) => [w.label, w]));
    expect(byLabel['Gemini Pro'].used).toBe('0');
    expect(byLabel['Gemini Flash'].used).toBe('50');
    expect(byLabel['Claude'].used).toBe('75');
    expect(byLabel['Gemini Pro'].resetsAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reads per-model quotas from fetchAvailableModels', () => {
    const windows = parseQuotaPayload({
      models: {
        'gemini-3-pro': {
          displayName: 'Gemini 3 Pro',
          quotaInfo: {
            remainingFraction: 0.4,
            resetTime: '2026-02-01T00:00:00Z',
          },
        },
        'claude-sonnet-4-5': {
          quotaInfo: { remainingFraction: 0.9 },
        },
      },
    });
    const byLabel = Object.fromEntries(windows.map((w) => [w.label, w]));
    expect(byLabel['Gemini 3 Pro'].used).toBe('60');
    expect(byLabel['Gemini 3 Pro'].resetsAt).toBe('2026-02-01T00:00:00Z');
    expect(byLabel['Claude Sonnet 4 5'].used).toBe('10');
  });

  it('ignores payloads without quota buckets', () => {
    expect(parseQuotaPayload({ ok: true })).toEqual([]);
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

  it('loads models when loadCodeAssist returns a project', async () => {
    const calls: string[] = [];
    const fetchImpl: AntigravityFetch = async (url) => {
      calls.push(url);
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({
            cloudaicompanionProject: 'proj-1',
            currentTier: { name: 'Free' },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          models: {
            'gemini-3-pro': { quotaInfo: { remainingFraction: 0.4 } },
          },
        }),
        { status: 200 },
      );
    };

    const quota = await loadAntigravityQuota('token', fetchImpl);
    expect(quota.projectId).toBe('proj-1');
    expect(quota.plan).toBe('Free');
    expect(quota.windows.map((w) => w.label)).toEqual(['Gemini 3 Pro']);
    expect(quota.windows[0].used).toBe('60');
    expect(calls.some((url) => url.includes('onboardUser'))).toBe(false);
  });

  it('onboards an account without a project, then loads models', async () => {
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
      return new Response(
        JSON.stringify({
          models: { 'gemini-3-pro': { quotaInfo: { remainingFraction: 1 } } },
        }),
        { status: 200 },
      );
    };

    const quota = await loadAntigravityQuota('token', fetchImpl, {
      sleep: async () => {},
    });
    expect(quota.projectId).toBe('managed-1');
    expect(calls.some((url) => url.includes('onboardUser'))).toBe(true);
    expect(quota.windows[0].used).toBe('0');
  });

  it('falls back to retrieveUserQuota when no models are returned', async () => {
    const calls: string[] = [];
    const fetchImpl: AntigravityFetch = async (url) => {
      calls.push(url);
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'proj-1' }),
          { status: 200 },
        );
      }
      if (url.includes('fetchAvailableModels')) {
        return new Response(JSON.stringify({ models: {} }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          buckets: [{ modelId: 'gemini-pro', remainingFraction: 0.3 }],
        }),
        { status: 200 },
      );
    };

    const quota = await loadAntigravityQuota('token', fetchImpl);
    expect(quota.windows.map((w) => w.label)).toEqual(['Gemini Pro']);
    expect(quota.windows[0].used).toBe('70');
    expect(calls.some((url) => url.includes('retrieveUserQuota'))).toBe(true);
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

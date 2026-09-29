import { describe, expect, it } from 'vitest';

import {
  buildAuthorizeUrl,
  parseCallbackUrl,
  parseTokenResponse,
  tokenExchangeBody,
} from '@/providers/antigravity/oauth';
import { parseQuotaPayload } from '@/providers/antigravity/quota';

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

  it('encodes the token exchange body', () => {
    const body = tokenExchangeBody({ code: 'c', verifier: 'v' });
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=c');
    expect(body).toContain('code_verifier=v');
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

  it('ignores payloads without quota buckets', () => {
    expect(parseQuotaPayload({ ok: true })).toEqual([]);
  });
});

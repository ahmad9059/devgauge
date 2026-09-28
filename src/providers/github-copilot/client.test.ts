import { describe, expect, it } from 'vitest';

import {
  fetchGitHubBillingUsage,
  githubBillingUrl,
  githubHeaders,
  GITHUB_API_VERSION,
} from '@/providers/github-copilot/client';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import { redactHeaders } from '@/services/network/redaction';

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

describe('github billing client', () => {
  it('builds personal and organization endpoints with encoded owners', () => {
    expect(githubBillingUrl('personal', 'octocat', 'ai_credit')).toBe(
      'https://api.github.com/users/octocat/settings/billing/ai_credit/usage',
    );
    expect(
      githubBillingUrl('organization', 'acme inc', 'premium_request'),
    ).toBe(
      'https://api.github.com/organizations/acme%20inc/settings/billing/premium_request/usage',
    );
  });

  it('sends the required API headers and keeps the token out of URLs', () => {
    const headers = githubHeaders('secret-token', {
      userAgent: 'devgauge/0.1.0',
    });
    expect(headers.Authorization).toBe('Bearer secret-token');
    expect(headers['X-GitHub-Api-Version']).toBe(GITHUB_API_VERSION);
    expect(headers['User-Agent']).toBe('devgauge/0.1.0');
  });

  it('redacts the token if the headers are ever logged', () => {
    const redacted = redactHeaders(githubHeaders('super-secret-token'));
    expect(redacted.Authorization).toBe('[redacted]');
    expect(JSON.stringify(redacted)).not.toContain('super-secret-token');
  });

  it('requests the allowlisted host through the shared client', async () => {
    const seen: { url?: string; headers?: Record<string, string> } = {};
    const fetchImpl: FetchLike = async (url, init) => {
      seen.url = url;
      seen.headers = init.headers;
      return res('{"usageItems":[]}');
    };
    const client = createHttpClient({ fetchImpl });
    const response = await fetchGitHubBillingUsage(client, {
      scope: 'personal',
      owner: 'octocat',
      kind: 'ai_credit',
      accessToken: 'tok',
      signal: new AbortController().signal,
    });
    expect(response.status).toBe(200);
    expect(seen.url).toBe(
      'https://api.github.com/users/octocat/settings/billing/ai_credit/usage',
    );
    expect(seen.headers?.Authorization).toBe('Bearer tok');
  });
});

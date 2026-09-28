import { describe, expect, it } from 'vitest';

import {
  createGitHubCopilotAdapter,
  githubCopilotDescriptor,
} from '@/providers/github-copilot/adapter';
import {
  changedSchemaFixture,
  organizationPremiumRequestFixture,
  personalAiCreditFixture,
} from '@/providers/github-copilot/fixtures';
import {
  createHttpClient,
  type FetchLike,
  type FetchResponseLike,
} from '@/services/network/client';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');

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

function contextFor(
  fetchImpl: FetchLike,
  overrides: { token?: string | null } = {},
) {
  const connection = makeConnection({
    id: 'g1',
    providerId: 'github-copilot',
    authMode: 'oauth-pkce',
    credentialRef: null,
  });
  return {
    connection,
    credential:
      overrides.token === null
        ? ({ kind: 'none' } as const)
        : ({ kind: 'oauth', accessToken: overrides.token ?? 'tok' } as const),
    now: NOW,
    signal: new AbortController().signal,
    client: createHttpClient({ fetchImpl }),
  };
}

describe('github copilot adapter', () => {
  it('is release-disabled in the registry descriptor', () => {
    expect(githubCopilotDescriptor().capabilities.liveUsage).toBe(false);
    expect(githubCopilotDescriptor().supportTier).toBe('candidate-supported');
  });

  it('fetches and normalizes both personal billing windows', async () => {
    const fetchImpl: FetchLike = async (url) =>
      url.includes('ai_credit')
        ? res(personalAiCreditFixture())
        : res(organizationPremiumRequestFixture());
    const adapter = createGitHubCopilotAdapter({
      owner: 'octocat',
      scope: 'personal',
    });
    const result = await adapter.fetchUsage!(contextFor(fetchImpl));
    expect(result.windows).toHaveLength(2);
    expect(result.windows.map((window) => window.unit)).toEqual([
      'credits',
      'requests',
    ]);
    expect(result.identity?.scope).toBe('personal');
  });

  it('keeps organization windows distinguishable from personal', async () => {
    const fetchImpl: FetchLike = async () => res(personalAiCreditFixture());
    const adapter = createGitHubCopilotAdapter({
      owner: 'acme',
      scope: 'organization',
    });
    const result = await adapter.fetchUsage!(contextFor(fetchImpl));
    expect(
      result.windows.every((window) =>
        window.externalKey.includes('.organization.acme.'),
      ),
    ).toBe(true);
  });

  it('surfaces unsupported managed accounts and auth failures', async () => {
    const adapter = createGitHubCopilotAdapter({
      owner: 'octocat',
      scope: 'personal',
    });
    await expect(
      adapter.fetchUsage!(contextFor(async () => res('', 404))),
    ).rejects.toMatchObject({ code: 'unsupported_account' });
    await expect(
      adapter.fetchUsage!(contextFor(async () => res('', 401))),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(
      adapter.fetchUsage!(contextFor(async () => res('', 403))),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('fails a changed schema safely', async () => {
    const adapter = createGitHubCopilotAdapter({
      owner: 'octocat',
      scope: 'personal',
    });
    await expect(
      adapter.fetchUsage!(contextFor(async () => res(changedSchemaFixture()))),
    ).rejects.toMatchObject({ code: 'schema_changed' });
  });

  it('requires an oauth credential', async () => {
    const adapter = createGitHubCopilotAdapter({
      owner: 'octocat',
      scope: 'personal',
    });
    await expect(
      adapter.fetchUsage!(
        contextFor(async () => res(personalAiCreditFixture()), {
          token: null,
        }),
      ),
    ).rejects.toMatchObject({ code: 'unauthorized' });
  });
});

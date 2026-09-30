import { describe, expect, it } from 'vitest';

import { syncAntigravity } from './sync';
import type { AntigravityFetch } from './quota';
import { latestByConnection } from '@/storage/repositories/usage';
import {
  getConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-30T20:00:00Z');

async function setup(withCredential = true) {
  const db = await createMigratedTestDatabase();
  const vault = createSecureVault(createMemorySecretStore());
  const ref = buildCredentialRef('gemini-cli', 'session-gemini-cli', 'oauth');
  await upsertConnection(
    db,
    makeConnection({
      id: 'session-gemini-cli',
      providerId: 'gemini-cli',
      canonicalAccountKey: 'session:gemini-cli',
      authMode: withCredential ? 'oauth-pkce' : 'web-session',
      credentialRef: withCredential ? ref : null,
    }),
  );
  if (withCredential) {
    await vault.save(ref, {
      version: 1,
      kind: 'oauth',
      accessToken: 'expired-access',
      refreshToken: 'saved-refresh',
      expiresAt: '2026-09-29T00:00:00Z',
    });
  }
  let id = 0;
  return { db, vault, ref, nextId: () => `sync-id-${++id}`, now: () => NOW };
}

describe('Antigravity background sync', () => {
  it('renews the expired token and saves both weekly and 5-hour windows', async () => {
    const deps = await setup();
    const requests: string[] = [];
    const fetchImpl: AntigravityFetch = async (url, init) => {
      requests.push(url);
      if (url.includes('oauth2.googleapis.com/token')) {
        expect(init.body).toContain('grant_type=refresh_token');
        expect(init.body).toContain('refresh_token=saved-refresh');
        return new Response(
          JSON.stringify({ access_token: 'fresh-access', expires_in: 3600 }),
          { status: 200 },
        );
      }
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Bearer fresh-access',
      );
      if (url.includes('loadCodeAssist')) {
        return new Response(
          JSON.stringify({ cloudaicompanionProject: 'project-1' }),
        );
      }
      if (url.includes('retrieveUserQuotaSummary')) {
        expect(init.body).toBe('{}');
        return new Response(
          JSON.stringify({
            groups: [
              {
                buckets: [
                  { bucketId: 'gemini-5h', remainingFraction: 0.75 },
                  { bucketId: 'gemini-weekly', remainingFraction: 0.6 },
                  { bucketId: '3p-5h', remainingFraction: 0.9 },
                  { bucketId: '3p-weekly', remainingFraction: 0.8 },
                ],
              },
            ],
          }),
        );
      }
      throw new Error(`unexpected endpoint: ${url}`);
    };
    expect(await syncAntigravity({ ...deps, fetchImpl })).toBe('success');
    const snapshot = (await latestByConnection(deps.db)).get(
      'session-gemini-cli',
    );
    expect(
      snapshot?.windows.map((window) => window.externalKey).sort(),
    ).toEqual([
      'antigravity.claude-gpt.five-hour',
      'antigravity.claude-gpt.weekly',
      'antigravity.gemini.five-hour',
      'antigravity.gemini.weekly',
    ]);
    expect((await deps.vault.load(deps.ref))?.refreshToken).toBe(
      'saved-refresh',
    );
    expect((await deps.vault.load(deps.ref))?.accessToken).toBe('fresh-access');
    expect(requests.filter((url) => url.includes('token'))).toHaveLength(1);
  });

  it('uses a valid access token without unnecessarily refreshing it', async () => {
    const deps = await setup();
    await deps.vault.save(deps.ref, {
      version: 1,
      kind: 'oauth',
      accessToken: 'valid-access',
      refreshToken: 'saved-refresh',
      expiresAt: '2026-10-01T00:00:00Z',
    });
    const fetchImpl: AntigravityFetch = async (url, init) => {
      expect(url).not.toContain('oauth2.googleapis.com');
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Bearer valid-access',
      );
      return new Response(
        url.includes('loadCodeAssist')
          ? JSON.stringify({ cloudaicompanionProject: 'project-1' })
          : JSON.stringify({
              groups: [
                {
                  buckets: [
                    { bucketId: 'gemini-weekly', remainingFraction: 0.8 },
                  ],
                },
              ],
            }),
      );
    };
    expect(await syncAntigravity({ ...deps, fetchImpl })).toBe('success');
  });

  it('keeps the previous snapshot when token renewal fails', async () => {
    const deps = await setup();
    const fetchImpl: AntigravityFetch = async () =>
      new Response('{}', { status: 400 });
    expect(await syncAntigravity({ ...deps, fetchImpl })).toBe('needs-sign-in');
    expect(
      (await latestByConnection(deps.db)).get('session-gemini-cli'),
    ).toBeUndefined();
    expect((await getConnection(deps.db, 'session-gemini-cli'))?.status).toBe(
      'expired',
    );
  });

  it('does not mark a connection expired on a temporary token-server failure', async () => {
    const deps = await setup();
    const fetchImpl: AntigravityFetch = async () =>
      new Response('{}', { status: 503 });
    await expect(syncAntigravity({ ...deps, fetchImpl })).rejects.toThrow(
      'temporarily unavailable',
    );
    expect((await getConnection(deps.db, 'session-gemini-cli'))?.status).toBe(
      'connected',
    );
  });

  it('requires one more sign-in for installations saved before credentials were persisted', async () => {
    const deps = await setup(false);
    const fetchImpl: AntigravityFetch = async () => {
      throw new Error('should not fetch');
    };
    expect(await syncAntigravity({ ...deps, fetchImpl })).toBe('needs-sign-in');
    expect((await getConnection(deps.db, 'session-gemini-cli'))?.status).toBe(
      'expired',
    );
  });
});

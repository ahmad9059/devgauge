import { ProviderError } from '@/domain/errors';
import type { NormalizedUsageResult } from '@/providers/types';
import type { Database } from '@/storage/database';
import {
  getConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import type { SecureVault, CredentialRecord } from '@/storage/secure-vault';
import { saveSessionSnapshot } from '@/services/web-session/session';

import {
  ANTIGRAVITY_TOKEN_URL,
  parseTokenResponse,
  tokenRefreshBody,
} from './oauth';
import {
  loadAntigravityQuota,
  type AntigravityFetch,
  type AntigravityDiscovery,
} from './quota';

const CONNECTION_ID = 'session-gemini-cli';
// Account/session generation scopes non-secret metadata. Never cache access tokens.
const discoveryByDatabase = new WeakMap<
  Database,
  Map<string, AntigravityDiscovery>
>();

export type AntigravitySyncResult = 'success' | 'needs-sign-in' | 'unavailable';

export type AntigravitySyncInput = {
  db: Database;
  vault: SecureVault;
  fetchImpl: AntigravityFetch;
  nextId: () => string;
  now?: () => Date;
};

/** Refresh an expired OAuth access token without opening the sign-in browser. */
async function renew(
  record: CredentialRecord,
  ref: string,
  vault: SecureVault,
  fetchImpl: AntigravityFetch,
  now: () => Date,
): Promise<CredentialRecord | null> {
  if (!record.refreshToken) return null;
  const response = await fetchImpl(ANTIGRAVITY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenRefreshBody(record.refreshToken),
  });
  if (response.status === 400 || response.status === 401) return null;
  if (!response.ok)
    throw new Error('Antigravity token refresh is temporarily unavailable');
  const token = parseTokenResponse(await response.json());
  const updated: CredentialRecord = {
    version: 1,
    kind: 'oauth',
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? record.refreshToken,
    ...(token.expiresIn
      ? {
          expiresAt: new Date(
            now().getTime() + token.expiresIn * 1000,
          ).toISOString(),
        }
      : {}),
  };
  await vault.save(ref, updated);
  return updated;
}

/**
 * Refreshes an existing Antigravity connection using its Keystore credential.
 * Never overwrites a good snapshot with empty/error data. Older installations
 * without a saved credential require one new browser sign-in to opt in.
 */
export async function fetchAntigravityUsage(
  input: AntigravitySyncInput,
): Promise<NormalizedUsageResult> {
  const { db, vault, fetchImpl, now = () => new Date() } = input;
  const connection = await getConnection(db, CONNECTION_ID);
  if (!connection || connection.status === 'disconnected')
    throw new ProviderError('unauthorized', 'Sign in again.');
  const needsSignIn = async (): Promise<never> => {
    throw new ProviderError('unauthorized', 'Sign in again.');
  };
  if (!connection.credentialRef) return needsSignIn();
  let credential = await vault.load(connection.credentialRef);
  if (credential?.kind !== 'oauth' || !credential.accessToken)
    return needsSignIn();

  const expiresAt = credential.expiresAt
    ? Date.parse(credential.expiresAt)
    : NaN;
  let renewed = false;
  if (!Number.isFinite(expiresAt) || expiresAt <= now().getTime() + 60_000) {
    credential = await renew(
      credential,
      connection.credentialRef,
      vault,
      fetchImpl,
      now,
    );
    if (!credential) return needsSignIn();
    renewed = true;
  }

  const discoveryKey = `${connection.id}:${connection.canonicalAccountKey}:${connection.connectedAt}:${connection.credentialRef}`;
  let discoveryByAccount = discoveryByDatabase.get(db);
  if (!discoveryByAccount) {
    discoveryByAccount = new Map();
    discoveryByDatabase.set(db, discoveryByAccount);
  }
  let discovery = discoveryByAccount.get(discoveryKey);
  if (!discovery) {
    if (discoveryByAccount.size >= 8) discoveryByAccount.clear();
    discovery = {
      projectId: null,
      plan: null,
      summaryEndpoint: null,
      expiresAt: 0,
    };
    discoveryByAccount.set(discoveryKey, discovery);
  }
  const loadQuota = () =>
    loadAntigravityQuota(credential!.accessToken!, fetchImpl, {
      discovery,
      allowOnboarding: false,
      now: () => now().getTime(),
    }).catch((error) => {
      discoveryByAccount.delete(discoveryKey);
      throw error;
    });
  let quota = await loadQuota();
  // Token can be revoked ahead of its expiry. Try once with the refresh token.
  if (
    quota.windows.length === 0 &&
    !renewed &&
    /(?:HTTP 401|HTTP 403)/.test(quota.detail)
  ) {
    credential = await renew(
      credential,
      connection.credentialRef,
      vault,
      fetchImpl,
      now,
    );
    if (!credential) return needsSignIn();
    discovery.projectId = null;
    discovery.summaryEndpoint = null;
    quota = await loadQuota();
  }
  if (quota.windows.length === 0)
    throw new ProviderError(
      /HTTP 401|HTTP 403/.test(quota.detail)
        ? 'unauthorized'
        : 'schema_changed',
      'Provider quota is unavailable.',
    );

  return {
    windows: quota.windows,
    fetchedAt: now().toISOString(),
    schemaVersion: 1,
    isPartial: false,
  };
}

export async function syncAntigravity(
  input: AntigravitySyncInput,
): Promise<AntigravitySyncResult> {
  const { db, nextId, now = () => new Date() } = input;
  const connection = await getConnection(db, CONNECTION_ID);
  if (!connection || connection.status === 'disconnected')
    return 'needs-sign-in';
  const startedAt = now();
  let quota: NormalizedUsageResult;
  try {
    quota = await fetchAntigravityUsage(input);
  } catch (error) {
    if (!(error instanceof ProviderError)) throw error;
    if (error.code === 'unauthorized') {
      await upsertConnection(db, {
        ...connection,
        status: 'expired',
        lastAttemptAt: now().toISOString(),
        updatedAt: now().toISOString(),
      });
      return 'needs-sign-in';
    }
    return 'unavailable';
  }

  await saveSessionSnapshot({
    db,
    providerId: 'gemini-cli',
    displayName: 'Antigravity',
    windows: quota.windows,
    startedAt,
    fetchedAt: now().toISOString(),
    now: now(),
    nextId,
    authMode: 'oauth-pkce',
    credentialRef: connection.credentialRef,
  });
  return 'success';
}

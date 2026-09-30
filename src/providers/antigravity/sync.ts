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
import { loadAntigravityQuota, type AntigravityFetch } from './quota';

const CONNECTION_ID = 'session-gemini-cli';

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
export async function syncAntigravity(
  input: AntigravitySyncInput,
): Promise<AntigravitySyncResult> {
  const { db, vault, fetchImpl, nextId, now = () => new Date() } = input;
  const connection = await getConnection(db, CONNECTION_ID);
  if (!connection || connection.status === 'disconnected')
    return 'needs-sign-in';
  const needsSignIn = async (): Promise<AntigravitySyncResult> => {
    await upsertConnection(db, {
      ...connection,
      status: 'expired',
      lastAttemptAt: now().toISOString(),
      updatedAt: now().toISOString(),
    });
    return 'needs-sign-in';
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

  let quota = await loadAntigravityQuota(credential.accessToken!, fetchImpl);
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
    quota = await loadAntigravityQuota(credential.accessToken!, fetchImpl);
  }
  if (quota.windows.length === 0) return 'unavailable';

  await saveSessionSnapshot({
    db,
    providerId: 'gemini-cli',
    displayName: 'Antigravity',
    windows: quota.windows,
    fetchedAt: now().toISOString(),
    now: now(),
    nextId,
    authMode: 'oauth-pkce',
    credentialRef: connection.credentialRef,
  });
  return 'success';
}

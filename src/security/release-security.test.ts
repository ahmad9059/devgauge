import { describe, expect, it } from 'vitest';

import {
  buildDiagnosticsExport,
  serializeDiagnosticsExport,
} from '@/services/diagnostics/export';
import { createSafeLogger } from '@/services/network/logger';
import { upsertConnection } from '@/storage/repositories/connections';
import { saveRefresh } from '@/storage/repositories/usage';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createMemorySecretStore } from '@/storage/secret-store';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const ACCESS_TOKEN = 'seeded-access-token-12345';
const BEARER = 'seeded-bearer-token-67890';

describe('release security: credential containment', () => {
  it('keeps credentials out of SQLite rows', async () => {
    const db = await createMigratedTestDatabase();
    const store = createMemorySecretStore();
    const vault = createSecureVault(store);
    const credentialRef = buildCredentialRef('github-copilot', 'c1', 'oauth');

    await upsertConnection(
      db,
      makeConnection({
        id: 'c1',
        providerId: 'github-copilot',
        authMode: 'oauth-pkce',
        credentialRef,
      }),
    );
    await vault.save(credentialRef, {
      version: 1,
      kind: 'oauth',
      accessToken: ACCESS_TOKEN,
    });
    await saveRefresh(db, {
      connection: {
        id: 'c1',
        status: 'connected',
        lastSuccessAt: NOW.toISOString(),
        lastAttemptAt: NOW.toISOString(),
        nextAllowedRefreshAt: null,
        updatedAt: NOW.toISOString(),
      },
      attempt: makeAttempt('c1', { id: 'a1' }),
      snapshot: {
        snapshot: makeSnapshot('c1', { id: 's1' }),
        windows: [makeWindow('s1')],
      },
    });

    const rows = [];
    for (const table of [
      'provider_connections',
      'usage_snapshots',
      'usage_windows',
      'refresh_attempts',
    ]) {
      rows.push(JSON.stringify(await db.all(`SELECT * FROM ${table}`)));
    }
    const sqliteDump = rows.join('\n');
    expect(sqliteDump).not.toContain(ACCESS_TOKEN);
    // Only the opaque reference is stored; the secret lives in SecureStore.
    expect(sqliteDump).toContain('provider.github-copilot.connection.c1');
    expect(await store.get(credentialRef)).toContain(ACCESS_TOKEN);
  });

  it('redacts seeded secrets in diagnostics and logs', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));
    await saveRefresh(db, {
      connection: {
        id: 'c1',
        status: 'error',
        lastSuccessAt: null,
        lastAttemptAt: NOW.toISOString(),
        nextAllowedRefreshAt: null,
        updatedAt: NOW.toISOString(),
      },
      attempt: makeAttempt('c1', {
        id: 'a1',
        outcome: 'failure',
        safeDetail: `Authorization: Bearer ${BEARER}`,
      }),
    });

    const diagnostics = serializeDiagnosticsExport(
      await buildDiagnosticsExport(db, { generatedAt: NOW.toISOString() }),
    );
    expect(diagnostics).not.toContain(BEARER);
    expect(diagnostics).toContain('[redacted]');

    const lines: string[] = [];
    const logger = createSafeLogger((line) => lines.push(line));
    logger.error('refresh failed', {
      token: ACCESS_TOKEN,
      headers: { Authorization: `Bearer ${BEARER}` },
    });
    const logs = lines.join('\n');
    expect(logs).not.toContain(ACCESS_TOKEN);
    expect(logs).not.toContain(BEARER);
  });
});

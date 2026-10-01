import { describe, expect, it } from 'vitest';

import { upsertConnection } from '@/storage/repositories/connections';
import { saveRefresh } from '@/storage/repositories/usage';
import {
  buildDiagnosticsExport,
  redactString,
  redactValue,
  serializeDiagnosticsExport,
} from '@/services/diagnostics/export';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import {
  makeAttempt,
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

describe('diagnostics redaction', () => {
  it('masks sensitive keys and credential-shaped strings', () => {
    expect(redactValue('accessToken', 'abc')).toBe('[redacted]');
    expect(redactValue('refresh_token', 'abc')).toBe('[redacted]');
    expect(redactValue('errorCode', 'rate_limited')).toBe('rate_limited');
    expect(redactString('Authorization: Bearer abc.def-123')).toBe(
      'Authorization: [redacted]',
    );
    expect(redactString('contact me@example.com')).toBe(
      'contact [redacted-email]',
    );
  });
});

describe('diagnostics export', () => {
  it('never contains seeded credentials or account identifiers', async () => {
    const db = await createMigratedTestDatabase();
    const connection = makeConnection({
      id: 'c1',
      accountHint: 'real.person@example.com',
    });
    await upsertConnection(db, connection);
    await saveRefresh(db, {
      connection: {
        id: 'c1',
        status: 'connected',
        lastSuccessAt: '2026-09-01T00:00:00.000Z',
        lastAttemptAt: '2026-09-01T00:00:00.000Z',
        nextAllowedRefreshAt: null,
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      attempt: makeAttempt('c1', {
        id: 'a1',
        safeDetail: 'Authorization: Bearer fake-secret-token-123',
      }),
      snapshot: {
        snapshot: makeSnapshot('c1', { id: 's1' }),
        windows: [makeWindow('s1')],
      },
    });

    const diagnostics = await buildDiagnosticsExport(db, {
      generatedAt: '2026-09-27T00:00:00.000Z',
    });
    const json = serializeDiagnosticsExport(diagnostics);

    expect(json).not.toContain('fake-secret-token-123');
    expect(json).not.toContain('real.person@example.com');
    expect(json).not.toContain(connection.credentialRef as string);
    expect(json).toContain('[redacted]');
  });

  it('reports redacted counts and credential presence, not values', async () => {
    const db = await createMigratedTestDatabase();
    await upsertConnection(db, makeConnection({ id: 'c1' }));

    const diagnostics = await buildDiagnosticsExport(db, {
      generatedAt: '2026-09-27T00:00:00.000Z',
    });

    expect(diagnostics.database.userVersion).toBe(3);
    expect(diagnostics.counts.connections).toBe(1);
    expect(diagnostics.connections[0]?.hasCredential).toBe(true);
    expect(diagnostics).not.toHaveProperty('connections.0.credentialRef');
  });
});

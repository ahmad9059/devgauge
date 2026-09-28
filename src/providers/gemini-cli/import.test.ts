import { describe, expect, it } from 'vitest';

import {
  importGeminiCliStats,
  parseGeminiCliStats,
} from '@/providers/gemini-cli/import';
import {
  geminiCliMalformedFixture,
  geminiCliReportedQuotaFixture,
  geminiCliSessionStatsFixture,
} from '@/providers/gemini-cli/fixtures';
import { upsertConnection } from '@/storage/repositories/connections';
import {
  getCliStatsImport,
  latestByConnection,
} from '@/storage/repositories/usage';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { makeConnection } from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');

async function setup() {
  const db = await createMigratedTestDatabase();
  await upsertConnection(
    db,
    makeConnection({
      id: 'g1',
      providerId: 'gemini-cli',
      authMode: 'manual',
      credentialRef: null,
    }),
  );
  let counter = 0;
  return { db, nextId: () => `id-${(counter += 1)}` };
}

describe('gemini cli user-shared stats', () => {
  it('stores session stats as manual, partial, and clearly labeled', async () => {
    const { db, nextId } = await setup();
    const result = await importGeminiCliStats({
      db,
      connectionId: 'g1',
      raw: JSON.parse(geminiCliSessionStatsFixture()),
      now: NOW,
      nextId,
    });

    expect(result.coverage).toBe('session');
    expect(result.isPartial).toBe(true);

    const snapshot = (await latestByConnection(db)).get('g1');
    expect(snapshot?.source).toBe('manual');
    expect(snapshot?.isPartial).toBe(true);
    expect(snapshot?.windows[0].derivation).toBe('manual');
    expect(snapshot?.windows[0].label).not.toMatch(/Gemini Apps/);

    const meta = await getCliStatsImport(db, result.snapshotId);
    expect(meta?.coverage).toBe('session');
    expect(meta?.cliVersion).toBe('0.5.0');
  });

  it('treats reported-quota figures as complete coverage', async () => {
    const { db, nextId } = await setup();
    const result = await importGeminiCliStats({
      db,
      connectionId: 'g1',
      raw: JSON.parse(geminiCliReportedQuotaFixture()),
      now: NOW,
      nextId,
    });
    expect(result.isPartial).toBe(false);
    const snapshot = (await latestByConnection(db)).get('g1');
    expect(snapshot?.windows[0].limitDecimal).toBe('1000');
  });

  it('rejects malformed user-shared input', async () => {
    const { db, nextId } = await setup();
    await expect(
      importGeminiCliStats({
        db,
        connectionId: 'g1',
        raw: JSON.parse(geminiCliMalformedFixture()),
        now: NOW,
        nextId,
      }),
    ).rejects.toThrow();
    expect(() =>
      parseGeminiCliStats(JSON.parse(geminiCliMalformedFixture())),
    ).toThrow();
  });
});

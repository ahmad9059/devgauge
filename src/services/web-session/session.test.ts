import { describe, expect, it } from 'vitest';

import {
  SESSION_PROVIDERS,
  allowedSessionHost,
} from '@/services/web-session/session-config';
import { saveSessionSnapshot } from '@/services/web-session/session';
import { extractUsageWindows } from '@/services/web-session/usage-extract';
import { latestByConnection } from '@/storage/repositories/usage';
import { getConnection } from '@/storage/repositories/connections';
import { createMigratedTestDatabase } from '@/testing/storage/database';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const claudeKeyMap = SESSION_PROVIDERS.claude.keyMap;

function response(url: string, body: unknown) {
  return { url, body: JSON.stringify(body) };
}

describe('session usage extraction', () => {
  it('extracts five-hour and weekly windows from a captured payload', () => {
    const captured = [
      response('https://claude.ai/api/usage', {
        five_hour: { utilization: 42, resets_at: '2026-09-28T05:00:00.000Z' },
        seven_day: { utilization: 71, resets_at: '2026-09-30T00:00:00.000Z' },
        seven_day_opus: { utilization: 12 },
      }),
    ];
    const result = extractUsageWindows(captured, claudeKeyMap);
    const labels = result.windows.map((window) => window.label).sort();
    expect(labels).toEqual(['5-hour window', 'Weekly', 'Weekly (Opus)']);

    const fiveHour = result.windows.find(
      (window) => window.label === '5-hour window',
    );
    expect(fiveHour?.used).toBe('42');
    expect(fiveHour?.limit).toBe('100');
    expect(fiveHour?.utilization).toBeCloseTo(0.42);
    expect(fiveHour?.resetsAt).toBe('2026-09-28T05:00:00.000Z');
    expect(result.matchedUrls).toContain('https://claude.ai/api/usage');
  });

  it('ignores unrelated bodies and unknown keys', () => {
    const result = extractUsageWindows(
      [
        response('https://claude.ai/api/settings', {
          theme: 'dark',
          name: 'x',
        }),
        response('https://claude.ai/api/usage', {
          mystery: { utilization: 0.5 },
        }),
      ],
      claudeKeyMap,
    );
    expect(result.windows).toHaveLength(0);
  });
});

describe('session host allowlist', () => {
  it('allows first-party and identity hosts only', () => {
    expect(
      allowedSessionHost('claude', 'https://claude.ai/settings/usage'),
    ).toBe('claude.ai');
    expect(allowedSessionHost('claude', 'https://evil.test/login')).toBeNull();
    expect(allowedSessionHost('claude', 'https://api.claude.ai/usage')).toBe(
      'api.claude.ai',
    );
    expect(
      allowedSessionHost('claude', 'https://claude.ai.evil.test'),
    ).toBeNull();
    expect(allowedSessionHost('claude', 'http://claude.ai/x')).toBeNull();
  });
});

describe('session persistence', () => {
  it('rolls back connection freshness and attempts when snapshot persistence fails', async () => {
    const db = await createMigratedTestDatabase();
    let counter = 0;
    const input = {
      db,
      providerId: 'claude' as const,
      displayName: 'Claude',
      windows: [],
      fetchedAt: NOW.toISOString(),
      now: NOW,
      nextId: () => `rollback-${++counter}`,
    };
    await saveSessionSnapshot(input);
    const before = await getConnection(db, 'session-claude');
    // Reject the snapshot after connection and attempt writes have executed.
    await db.exec(`CREATE TRIGGER reject_snapshot BEFORE INSERT ON usage_snapshots
      BEGIN SELECT RAISE(ABORT, 'injected persistence failure'); END`);
    await expect(
      saveSessionSnapshot({
        ...input,
        fetchedAt: '2026-09-29T00:00:00Z',
        now: new Date('2026-09-29T00:00:00Z'),
      }),
    ).rejects.toThrow('injected persistence failure');
    expect(await getConnection(db, 'session-claude')).toEqual(before);
    expect(
      await db.first<{ count: number }>(
        'SELECT count(*) AS count FROM refresh_attempts',
      ),
    ).toEqual({ count: 1 });
    expect(
      (await latestByConnection(db)).get('session-claude')?.fetchedAt,
    ).toBe(NOW.toISOString());
    await db.exec('DROP TRIGGER reject_snapshot');
    await saveSessionSnapshot({ ...input, providerId: 'codex' });
    expect((await latestByConnection(db)).size).toBe(2);
  });
  it('persists parallel provider completions without overlapping shared SQLite transactions', async () => {
    const db = await createMigratedTestDatabase();
    let counter = 0;
    const windows = extractUsageWindows(
      [
        response('https://claude.ai/api/usage', {
          five_hour: { utilization: 42 },
        }),
      ],
      claudeKeyMap,
    ).windows;
    await Promise.all(
      ['claude', 'codex', 'command-code', 'gemini-cli'].map((providerId) =>
        saveSessionSnapshot({
          db,
          providerId: providerId as
            'claude' | 'codex' | 'command-code' | 'gemini-cli',
          displayName: providerId,
          windows,
          fetchedAt: NOW.toISOString(),
          now: NOW,
          nextId: () => `parallel-${++counter}`,
        }),
      ),
    );
    expect((await latestByConnection(db)).size).toBe(4);
  });
  it('writes a web-session connection and its windows', async () => {
    const db = await createMigratedTestDatabase();
    const extracted = extractUsageWindows(
      [
        response('https://claude.ai/api/usage', {
          five_hour: { utilization: 42 },
        }),
      ],
      claudeKeyMap,
    );
    let counter = 0;
    const result = await saveSessionSnapshot({
      db,
      providerId: 'claude',
      displayName: 'Claude web session',
      windows: extracted.windows,
      fetchedAt: NOW.toISOString(),
      now: NOW,
      nextId: () => `id-${(counter += 1)}`,
    });

    expect(result.windowCount).toBe(1);
    const connection = await getConnection(db, 'session-claude');
    expect(connection?.authMode).toBe('web-session');
    expect(connection?.credentialRef).toBeNull();
    const snapshot = (await latestByConnection(db)).get('session-claude');
    expect(snapshot?.source).toBe('live');
    expect(snapshot?.windows[0].usedDecimal).toBe('42');
  });
});

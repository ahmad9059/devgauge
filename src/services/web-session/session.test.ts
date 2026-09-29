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
        five_hour: { utilization: 0.42, resets_at: '2026-09-28T05:00:00.000Z' },
        seven_day: { utilization: 0.71, resets_at: '2026-09-30T00:00:00.000Z' },
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
    expect(allowedSessionHost('claude', 'http://claude.ai/x')).toBeNull();
  });
});

describe('session persistence', () => {
  it('writes a web-session connection and its windows', async () => {
    const db = await createMigratedTestDatabase();
    const extracted = extractUsageWindows(
      [
        response('https://claude.ai/api/usage', {
          five_hour: { utilization: 0.42 },
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

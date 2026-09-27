import { describe, expect, it } from 'vitest';

import {
  APP_SETTING_KEYS,
  getSetting,
  listSettings,
  setSetting,
} from '@/storage/repositories/settings';
import { createMigratedTestDatabase } from '@/testing/storage/database';

const NOW = '2026-09-01T00:00:00.000Z';

describe('settings repository', () => {
  it('round-trips a valid known setting', async () => {
    const db = await createMigratedTestDatabase();
    await setSetting(db, 'appearance.theme', 'dark', NOW);
    expect(await getSetting(db, 'appearance.theme')).toBe('dark');
  });

  it('validates values at write time', async () => {
    const db = await createMigratedTestDatabase();
    await expect(
      setSetting(db, 'appearance.theme', 'neon', NOW),
    ).rejects.toThrow(/Expected one of/);
    await expect(
      setSetting(db, 'dashboard.historyDays', 0, NOW),
    ).rejects.toThrow(/integer between/);
  });

  it('validates provider order against the closed registry', async () => {
    const db = await createMigratedTestDatabase();
    await setSetting(db, 'dashboard.providerOrder', ['claude', 'codex'], NOW);
    expect(await getSetting(db, 'dashboard.providerOrder')).toEqual([
      'claude',
      'codex',
    ]);
    await expect(
      setSetting(db, 'dashboard.providerOrder', ['claude', 'gemini'], NOW),
    ).rejects.toThrow(/provider ids/);
    await expect(
      setSetting(db, 'dashboard.providerOrder', ['claude', 'claude'], NOW),
    ).rejects.toThrow(/duplicates/);
  });

  it('validates quiet hours format', async () => {
    const db = await createMigratedTestDatabase();
    await setSetting(
      db,
      'notifications.quietHours',
      { start: '22:00', end: '07:00' },
      NOW,
    );
    expect(await getSetting(db, 'notifications.quietHours')).toEqual({
      start: '22:00',
      end: '07:00',
    });
    await expect(
      setSetting(
        db,
        'notifications.quietHours',
        { start: '25:00', end: '07:00' },
        NOW,
      ),
    ).rejects.toThrow(/HH:MM/);
  });

  it('throws on corrupt stored data instead of returning it', async () => {
    const db = await createMigratedTestDatabase();
    await db.run(
      'INSERT INTO app_settings (key, value_json, updated_at) VALUES (?,?,?)',
      ['appearance.theme', '"not-a-theme"', NOW],
    );
    await expect(getSetting(db, 'appearance.theme')).rejects.toThrow(
      /Expected one of/,
    );
  });

  it('preserves unknown keys written by a newer app version', async () => {
    const db = await createMigratedTestDatabase();
    await db.run(
      'INSERT INTO app_settings (key, value_json, updated_at) VALUES (?,?,?)',
      ['future.featureFlag', 'true', NOW],
    );
    const all = await listSettings(db);
    expect(all).toContainEqual({ key: 'future.featureFlag', value: true });
  });

  it('exposes the documented setting keys', () => {
    expect(APP_SETTING_KEYS).toContain('dashboard.accountSelection');
    expect(APP_SETTING_KEYS).toContain('capabilities.lastKnownManifest');
  });
});

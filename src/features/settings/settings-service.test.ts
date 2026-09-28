import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APP_SETTINGS,
  fromStoredTextScale,
  loadAppSettings,
  saveHistoryDays,
  savePermissionAsked,
  saveProviderOrder,
  saveQuietHours,
  saveTextScale,
  saveTheme,
  toStoredTextScale,
} from '@/features/settings/settings-service';
import { createMigratedTestDatabase } from '@/testing/storage/database';

const NOW = new Date('2026-09-28T00:00:00.000Z');

describe('settings service', () => {
  it('returns defaults on a fresh database', async () => {
    const db = await createMigratedTestDatabase();
    expect(await loadAppSettings(db)).toEqual(DEFAULT_APP_SETTINGS);
  });

  it('persists and reloads appearance, dashboard, and privacy settings', async () => {
    const db = await createMigratedTestDatabase();
    await saveTheme(db, 'dark', NOW);
    await saveTextScale(db, 1.5, NOW);
    await saveProviderOrder(db, ['claude', 'codex'], NOW);
    await saveHistoryDays(db, 30, NOW);
    await saveQuietHours(db, { start: '22:00', end: '07:00' }, NOW);
    await savePermissionAsked(db, true, NOW);

    const settings = await loadAppSettings(db);
    expect(settings.theme).toBe('dark');
    expect(settings.textScale).toBe(1.5);
    expect(settings.providerOrder).toEqual(['claude', 'codex']);
    expect(settings.historyDays).toBe(30);
    expect(settings.quietHours).toEqual({ start: '22:00', end: '07:00' });
    expect(settings.permissionAsked).toBe(true);
  });

  it('round-trips every text-scale preset losslessly', () => {
    for (const scale of [1, 1.15, 1.3, 1.5] as const) {
      expect(fromStoredTextScale(toStoredTextScale(scale))).toBe(scale);
    }
  });

  it('accepts clearing quiet hours', async () => {
    const db = await createMigratedTestDatabase();
    await saveQuietHours(db, { start: '22:00', end: '07:00' }, NOW);
    await saveQuietHours(db, null, NOW);
    expect((await loadAppSettings(db)).quietHours).toBeNull();
  });
});

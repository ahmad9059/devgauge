import type { TextScale } from '@/design/theme-provider';
import type { ThemePreference } from '@/design/themes';
import type { ProviderId } from '@/domain/providers';
import type { Database } from '@/storage/database';
import { getSetting, setSetting } from '@/storage/repositories/settings';

export type StoredTextScale = 'system' | 'compact' | 'comfortable' | 'large';

/** Maps the numeric in-app presets onto the persisted enum, losslessly. */
export function toStoredTextScale(scale: TextScale): StoredTextScale {
  switch (scale) {
    case 1.15:
      return 'compact';
    case 1.3:
      return 'comfortable';
    case 1.5:
      return 'large';
    default:
      return 'system';
  }
}

export function fromStoredTextScale(preset: StoredTextScale): TextScale {
  switch (preset) {
    case 'compact':
      return 1.15;
    case 'comfortable':
      return 1.3;
    case 'large':
      return 1.5;
    default:
      return 1;
  }
}

export type AppSettings = {
  theme: ThemePreference;
  textScale: TextScale;
  providerOrder: ProviderId[];
  historyDays: number;
  quietHours: { start: string; end: string } | null;
  permissionAsked: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  textScale: 1,
  providerOrder: [],
  historyDays: 90,
  quietHours: null,
  permissionAsked: false,
};

export async function loadAppSettings(db: Database): Promise<AppSettings> {
  const [
    theme,
    textScale,
    providerOrder,
    historyDays,
    quietHours,
    permissionAsked,
  ] = await Promise.all([
    getSetting(db, 'appearance.theme'),
    getSetting(db, 'appearance.textScale'),
    getSetting(db, 'dashboard.providerOrder'),
    getSetting(db, 'dashboard.historyDays'),
    getSetting(db, 'notifications.quietHours'),
    getSetting(db, 'notifications.permissionAsked'),
  ]);

  return {
    theme: (theme as ThemePreference | null) ?? DEFAULT_APP_SETTINGS.theme,
    textScale:
      textScale === null
        ? DEFAULT_APP_SETTINGS.textScale
        : fromStoredTextScale(textScale as StoredTextScale),
    providerOrder:
      (providerOrder as ProviderId[] | null) ??
      DEFAULT_APP_SETTINGS.providerOrder,
    historyDays:
      (historyDays as number | null) ?? DEFAULT_APP_SETTINGS.historyDays,
    quietHours:
      (quietHours as { start: string; end: string } | null) ??
      DEFAULT_APP_SETTINGS.quietHours,
    permissionAsked:
      (permissionAsked as boolean | null) ??
      DEFAULT_APP_SETTINGS.permissionAsked,
  };
}

export async function saveTheme(
  db: Database,
  theme: ThemePreference,
  now: Date,
): Promise<void> {
  await setSetting(db, 'appearance.theme', theme, now.toISOString());
}

export async function saveTextScale(
  db: Database,
  scale: TextScale,
  now: Date,
): Promise<void> {
  await setSetting(
    db,
    'appearance.textScale',
    toStoredTextScale(scale),
    now.toISOString(),
  );
}

export async function saveProviderOrder(
  db: Database,
  order: ProviderId[],
  now: Date,
): Promise<void> {
  await setSetting(db, 'dashboard.providerOrder', order, now.toISOString());
}

export async function saveHistoryDays(
  db: Database,
  days: number,
  now: Date,
): Promise<void> {
  await setSetting(db, 'dashboard.historyDays', days, now.toISOString());
}

export async function saveQuietHours(
  db: Database,
  quietHours: { start: string; end: string } | null,
  now: Date,
): Promise<void> {
  await setSetting(
    db,
    'notifications.quietHours',
    quietHours,
    now.toISOString(),
  );
}

export async function savePermissionAsked(
  db: Database,
  value: boolean,
  now: Date,
): Promise<void> {
  await setSetting(
    db,
    'notifications.permissionAsked',
    value,
    now.toISOString(),
  );
}

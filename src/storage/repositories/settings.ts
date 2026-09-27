import { isProviderId } from '@/domain/providers';
import type { Database } from '@/storage/database';

export const APP_SETTING_KEYS = [
  'appearance.theme',
  'appearance.textScale',
  'dashboard.providerOrder',
  'dashboard.accountSelection',
  'dashboard.historyDays',
  'notifications.permissionAsked',
  'notifications.quietHours',
  'privacy.diagnosticsConsent',
  'capabilities.lastKnownManifest',
] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

export type SettingCodec = {
  /** Validates and returns the stored shape, or throws on invalid input. */
  parse(value: unknown): unknown;
  serialize(value: unknown): unknown;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function enumCodec(values: readonly string[]): SettingCodec {
  return {
    parse(value) {
      if (typeof value !== 'string' || !values.includes(value)) {
        throw new Error(`Expected one of: ${values.join(', ')}`);
      }
      return value;
    },
    serialize: (value) => value,
  };
}

function booleanCodec(): SettingCodec {
  return {
    parse(value) {
      if (typeof value !== 'boolean') throw new Error('Expected a boolean');
      return value;
    },
    serialize: (value) => value,
  };
}

function integerCodec(min: number, max: number): SettingCodec {
  return {
    parse(value) {
      if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < min ||
        value > max
      ) {
        throw new Error(`Expected an integer between ${min} and ${max}`);
      }
      return value;
    },
    serialize: (value) => value,
  };
}

function providerOrderCodec(): SettingCodec {
  return {
    parse(value) {
      if (!Array.isArray(value) || value.some((item) => !isProviderId(item))) {
        throw new Error('providerOrder must be an array of provider ids');
      }
      const unique = [...new Set(value as string[])];
      if (unique.length !== value.length) {
        throw new Error('providerOrder must not contain duplicates');
      }
      return unique;
    },
    serialize: (value) => value,
  };
}

function accountSelectionCodec(): SettingCodec {
  return {
    parse(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('accountSelection must be an object');
      }
      for (const [key, selection] of Object.entries(value)) {
        if (!isProviderId(key)) {
          throw new Error(`Unknown provider in accountSelection: ${key}`);
        }
        if (selection === 'auto') continue;
        if (
          !Array.isArray(selection) ||
          selection.some(
            (item) => typeof item !== 'string' || item.length === 0,
          )
        ) {
          throw new Error(
            'accountSelection values must be "auto" or connection id arrays',
          );
        }
      }
      return value;
    },
    serialize: (value) => value,
  };
}

function quietHoursCodec(): SettingCodec {
  return {
    parse(value) {
      if (value === null) return null;
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('quietHours must be null or { start, end }');
      }
      const { start, end } = value as { start?: unknown; end?: unknown };
      if (
        typeof start !== 'string' ||
        typeof end !== 'string' ||
        !HHMM.test(start) ||
        !HHMM.test(end)
      ) {
        throw new Error('quietHours start and end must be HH:MM');
      }
      return { start, end };
    },
    serialize: (value) => value,
  };
}

function manifestCodec(): SettingCodec {
  return {
    parse(value) {
      if (
        value !== null &&
        (typeof value !== 'object' || Array.isArray(value))
      ) {
        throw new Error('capability manifest must be an object or null');
      }
      return value;
    },
    serialize: (value) => value,
  };
}

export const settingCodecs: Record<AppSettingKey, SettingCodec> = {
  'appearance.theme': enumCodec(['system', 'light', 'dark']),
  'appearance.textScale': enumCodec([
    'system',
    'compact',
    'comfortable',
    'large',
  ]),
  'dashboard.providerOrder': providerOrderCodec(),
  'dashboard.accountSelection': accountSelectionCodec(),
  'dashboard.historyDays': integerCodec(1, 3650),
  'notifications.permissionAsked': booleanCodec(),
  'notifications.quietHours': quietHoursCodec(),
  'privacy.diagnosticsConsent': booleanCodec(),
  'capabilities.lastKnownManifest': manifestCodec(),
};

export function isAppSettingKey(value: string): value is AppSettingKey {
  return (APP_SETTING_KEYS as readonly string[]).includes(value);
}

/** Reads and runtime-validates a known setting. Invalid stored data throws. */
export async function getSetting(
  db: Database,
  key: AppSettingKey,
  codec: SettingCodec = settingCodecs[key],
): Promise<unknown | null> {
  const row = await db.first<{ value_json: string }>(
    'SELECT value_json FROM app_settings WHERE key = ?',
    [key],
  );
  if (!row) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value_json);
  } catch {
    throw new Error(`Stored setting ${key} is not valid JSON`);
  }
  return codec.parse(parsed);
}

export async function setSetting(
  db: Database,
  key: AppSettingKey,
  value: unknown,
  nowIso: string,
  codec: SettingCodec = settingCodecs[key],
): Promise<void> {
  const validated = codec.parse(value);
  await db.run(
    `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?,?,?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [key, JSON.stringify(codec.serialize(validated)), nowIso],
  );
}

export async function deleteSetting(
  db: Database,
  key: AppSettingKey,
): Promise<void> {
  await db.run('DELETE FROM app_settings WHERE key = ?', [key]);
}

/**
 * Returns every stored setting, including unknown keys written by a newer app
 * version. Unknown keys survive migrations untouched.
 */
export async function listSettings(
  db: Database,
): Promise<Array<{ key: string; value: unknown }>> {
  const rows = await db.all<{ key: string; value_json: string }>(
    'SELECT key, value_json FROM app_settings ORDER BY key ASC',
  );
  return rows.map((row) => ({
    key: row.key,
    value: JSON.parse(row.value_json),
  }));
}

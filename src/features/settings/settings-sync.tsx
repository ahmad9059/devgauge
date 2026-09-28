import { useEffect } from 'react';

import { useTheme } from '@/design/theme-provider';
import { getAppDatabase } from '@/services/app-database-store';

import { loadAppSettings } from './settings-service';

/**
 * Hydrates persisted appearance settings once at startup. If the database is
 * unavailable the app keeps its in-memory defaults and stays fully usable.
 */
export function SettingsSync() {
  const { setPreference, setTextScale } = useTheme();

  useEffect(() => {
    let active = true;
    getAppDatabase()
      .then(loadAppSettings)
      .then((settings) => {
        if (!active) return;
        setPreference(settings.theme);
        setTextScale(settings.textScale);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setPreference, setTextScale]);

  return null;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppearanceMode } from "../theme";

const PREFS_KEY = "devgauge.cache.preferences.v1";

export interface AppearancePreferences {
  appearance: AppearanceMode;
  textScale: number;
}

const DEFAULT_PREFS: AppearancePreferences = { appearance: "system", textScale: 1 };

export const readPreferences = async (): Promise<AppearancePreferences> => {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppearancePreferences>;
    return {
      appearance: parsed.appearance === "dark" || parsed.appearance === "light" || parsed.appearance === "system" ? parsed.appearance : "system",
      textScale: typeof parsed.textScale === "number" && parsed.textScale >= 0.5 && parsed.textScale <= 2 ? parsed.textScale : 1,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const writePreferences = async (prefs: AppearancePreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort; never break the app for a cache write.
  }
};

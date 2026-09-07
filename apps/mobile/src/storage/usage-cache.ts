import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ProviderUsage } from "@devgauge/contracts";

const USAGE_CACHE_KEY = "devgauge.cache.usage.v1";

export interface CachedUsage {
  cachedAt: string;
  providers: ProviderUsage[];
}

/**
 * Lightweight offline cache for normalized usage DTOs (Phase 4). No provider
 * credentials are ever cached. Phase 9 upgrades this to SQLCipher-backed SQLite
 * with user partitioning.
 */
export const readUsageCache = async (): Promise<CachedUsage | null> => {
  try {
    const raw = await AsyncStorage.getItem(USAGE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedUsage;
  } catch {
    return null;
  }
};

export const writeUsageCache = async (providers: ProviderUsage[]): Promise<void> => {
  try {
    const entry: CachedUsage = { cachedAt: new Date().toISOString(), providers };
    await AsyncStorage.setItem(USAGE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Cache is best-effort; failures must never break the app.
  }
};

export const clearUsageCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(USAGE_CACHE_KEY);
};
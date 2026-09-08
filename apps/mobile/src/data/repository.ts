import type { AlertEvent, AlertRule, HistorySeriesResponse, ProviderConnection, ProviderId, ProviderUsage } from "@devgauge/contracts";
import { PROVIDER_DISPLAY_ORDER } from "@devgauge/contracts";

import { api } from "../api/client";
import { providerConnections as mockConnections, providerUsageList as mockUsageList } from "./mock-usage-repository";
import { readUsageCache, writeUsageCache } from "../storage/usage-cache";

export type UsageByProvider = Partial<Record<ProviderId, ProviderUsage>>;

export interface LoadedState<T> {
  kind: "loading" | "ready" | "retained-error" | "blocking-error";
  data: T;
  error?: string;
  fromCache: boolean;
  revalidating: boolean;
}

export const emptyLoad = <T>(data: T): LoadedState<T> => ({
  kind: "loading",
  data,
  fromCache: false,
  revalidating: false,
});

export interface UsageLoadResult {
  usage: LoadedState<UsageByProvider>;
  connections: ProviderConnection[];
}

const toMap = (usage: ProviderUsage[]): UsageByProvider => {
  const map: UsageByProvider = {};
  for (const entry of usage) map[entry.provider] = entry;
  return map;
};

/**
 * Loads usage for all four providers. Renders cached data first (honest
 * offline startup), revalidates against the API, and preserves last-known-good
 * data on failure instead of blanking the screen.
 */
export const loadUsage = async (signal?: { cancelled: boolean }): Promise<UsageLoadResult> => {
  const cached = await readUsageCache();
  let usage: LoadedState<UsageByProvider> = emptyLoad(toMap(cached?.providers ?? []));
  if (cached) usage = { kind: "ready", data: toMap(cached.providers), fromCache: true, revalidating: true };

  try {
    const [u, c] = await Promise.all([api.usage(), api.connections().catch(() => ({ connections: [] as ProviderConnection[] }))]);
    if (signal?.cancelled) return { usage, connections: c.connections };
    const map = toMap(u.providers);
    usage = { kind: "ready", data: map, fromCache: false, revalidating: false };
    await writeUsageCache(u.providers);
    return { usage, connections: orderConnections(c.connections) };
  } catch (error) {
    if (signal?.cancelled) return { usage, connections: [] };
    if (Object.keys(usage.data).length > 0) {
      usage = {
        ...usage,
        kind: "retained-error",
        fromCache: true,
        revalidating: false,
        error: error instanceof Error ? error.message : "Could not reach DevGauge",
      };
      return { usage, connections: await mockConnections().catch(() => []) };
    }
    const mock = await mockUsageList().catch(() => [] as ProviderUsage[]);
    return {
      usage: { kind: "blocking-error", data: toMap(mock), fromCache: false, revalidating: false, error: "Could not load usage" },
      connections: await mockConnections().catch(() => []),
    };
  }
};

/** Projects all four provider connection slots in the canonical order. */
export const orderConnections = (connections: ProviderConnection[]): ProviderConnection[] =>
  PROVIDER_DISPLAY_ORDER.map(
    (provider) =>
      connections.find((entry) => entry.provider === provider) ?? {
        provider,
        state: "disconnected",
        refresh: "idle",
        plan: null,
        adapterVersion: "",
        lastVerifiedAt: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      }
  );

export const orderedProviders = (): readonly ProviderId[] => PROVIDER_DISPLAY_ORDER;

export interface HistoryQuery {
  provider: ProviderId;
  windowId?: string;
  resolution: "raw" | "daily";
  from: string;
  to: string;
  cursor?: string;
  limit?: number;
}

export const loadHistory = (query: HistoryQuery): Promise<HistorySeriesResponse> => api.historySeries(query);
export const loadAlerts = async (): Promise<AlertRule[]> => (await api.alerts()).alerts;
export const loadAlertEvents = async (): Promise<AlertEvent[]> => (await api.alertEvents()).events;

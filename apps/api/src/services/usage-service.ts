import { PROVIDER_DISPLAY_ORDER, type ProviderId, type ProviderUsage } from "@devgauge/contracts";

import type { Db } from "@devgauge/database";
import {
  getConnection,
  evaluateUsageAlerts,
  getLatestSnapshotIdsByUser,
  getSnapshotWithWindows,
  insertActivityDaily,
  insertSnapshot,
  insertWindows,
  listHistory,
  setLatestUsage,
  updateConnectionState,
} from "@devgauge/database";
import { ProviderError } from "@devgauge/provider-core";

import type { CryptoService } from "../plugins/crypto.js";
import { contentHashOf } from "./mappers.js";
import { fetchConnectionUsage, type ProviderFetcherContext } from "./provider-fetch.js";

export interface RefreshContext {
  crypto?: CryptoService;
  mockTransport?: boolean;
  copilotRuntimeMode?: "sandbox" | "sdk";
}

/**
 * Refreshes one provider connection and persists a normalized snapshot.
 * A failed refresh updates health but never clears the latest valid snapshot.
 * Contract drift and transient failures are distinguished on the connection.
 */
export const refreshProviderUsage = async (
  db: Db,
  input: {
    userId: string;
    provider: ProviderId;
    adapterVersion: string;
    ctx?: RefreshContext;
  }
): Promise<void> => {
  const connection = await getConnection(db, input.userId, input.provider);
  if (!connection) return;

  await updateConnectionState(db, {
    id: connection.id,
    userId: input.userId,
    state: "connected",
    refreshState: "running",
    adapterVersion: input.adapterVersion,
  });

  try {
    const fetcherCtx: ProviderFetcherContext | undefined = input.ctx?.crypto
      ? {
          db,
          crypto: input.ctx.crypto,
          mockTransport: input.ctx.mockTransport ?? true,
          copilotRuntimeMode: input.ctx.copilotRuntimeMode ?? "sandbox",
        }
      : undefined;
    const usage = fetcherCtx ? await fetchConnectionUsage(fetcherCtx, connection) : usageFallback(input.provider);

    const snapshotId = await insertSnapshot(db, {
      userId: input.userId,
      connectionId: connection.id,
      provider: input.provider,
      plan: usage.plan,
      contentHash: contentHashOf(usage),
      source: usage.source,
      adapterVersion: input.adapterVersion,
      fetchedAt: usage.fetchedAt,
      capturedAt: usage.capturedAt ?? null,
      stale: usage.stale,
      responseStatus: 200,
    });
    await insertWindows(db, snapshotId, usage.windows);
    if (usage.dailyUsage) {
      for (const day of usage.dailyUsage) {
        await insertActivityDaily(db, {
          userId: input.userId,
          connectionId: connection.id,
          provider: input.provider,
          date: day.startDate,
          tokens: day.tokens,
          source: usage.source,
        });
      }
    }
    await setLatestUsage(db, {
      userId: input.userId,
      provider: input.provider,
      connectionId: connection.id,
      snapshotId,
    });
    await evaluateUsageAlerts(db, {
      userId: input.userId,
      connectionId: connection.id,
      snapshotId,
      usage,
    });
    await updateConnectionState(db, {
      id: connection.id,
      userId: input.userId,
      state: "connected",
      refreshState: "succeeded",
      lastVerifiedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      lastErrorAt: null,
    });
  } catch (error) {
    const contract = error instanceof ProviderError && error.code === "contract_drift";
    const transient = error instanceof ProviderError && error.retryable;
    await updateConnectionState(db, {
      id: connection.id,
      userId: input.userId,
      state: "connected",
      refreshState: contract ? "contract_failed" : transient ? "transient_failed" : "permanent_failed",
      lastErrorCode: error instanceof ProviderError ? error.code : "internal",
      lastErrorMessage: error instanceof Error ? error.message.slice(0, 500) : "Refresh failed",
      lastErrorAt: new Date(),
    });
  }
};

import { fetchMockUsage } from "./mock-provider.js";
const usageFallback = (provider: ProviderId): ProviderUsage => fetchMockUsage(provider);

/** Builds the current all-provider usage read model from latest snapshots. */
export const getUsageReadModel = async (db: Db, userId: string): Promise<ProviderUsage[]> => {
  const latest = await getLatestSnapshotIdsByUser(db, userId);
  const providers: ProviderUsage[] = [];
  for (const row of latest) {
    const usage = await getSnapshotWithWindows(db, row.snapshotId, userId);
    if (usage) {
      providers.push({
        ...usage,
        stale: usage.stale || Date.now() - new Date(usage.fetchedAt).getTime() > 20 * 60_000,
      });
    }
  }
  return providers.sort((a, b) => PROVIDER_DISPLAY_ORDER.indexOf(a.provider) - PROVIDER_DISPLAY_ORDER.indexOf(b.provider));
};

export interface HistoryPage {
  items: ProviderUsage[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Cursor-paginated provider usage history, newest first. */
export const getHistory = async (
  db: Db,
  input: { userId: string; provider?: string; beforeId?: string; limit: number }
): Promise<HistoryPage> => {
  const cappedLimit = Math.min(Math.max(input.limit, 1), 100);
  const entries = await listHistory(db, { ...input, limit: cappedLimit });
  const items: ProviderUsage[] = [];
  for (const entry of entries.slice(0, cappedLimit)) {
    const usage = await getSnapshotWithWindows(db, entry.snapshotId, input.userId);
    if (usage) items.push(usage);
  }
  const hasMore = entries.length > cappedLimit;
  const nextCursor = hasMore ? entries[cappedLimit - 1]?.snapshotId ?? null : null;
  return { items, nextCursor, hasMore };
};

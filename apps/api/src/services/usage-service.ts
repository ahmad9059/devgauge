import type { ProviderId, ProviderUsage } from "@devgauge/contracts";

import type { Db } from "@devgauge/database";
import {
  getConnection,
  getLatestSnapshotIdsByUser,
  getSnapshotWithWindows,
  insertActivityDaily,
  insertSnapshot,
  insertWindows,
  listHistory,
  setLatestUsage,
  updateConnectionState,
} from "@devgauge/database";

import { contentHashOf } from "./mappers.js";
import { fetchMockUsage } from "./mock-provider.js";

/**
 * Refreshes one provider connection through the mock adapter (Phase 4) and
 * persists a normalized snapshot. A failed refresh updates health but never
 * clears the latest valid snapshot.
 */
export const refreshProviderUsage = async (
  db: Db,
  input: { userId: string; provider: ProviderId; adapterVersion: string }
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
    const usage = fetchMockUsage(input.provider);
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
    await updateConnectionState(db, {
      id: connection.id,
      userId: input.userId,
      state: "connected",
      refreshState: "transient_failed",
      lastErrorCode: "transient_upstream",
      lastErrorMessage: error instanceof Error ? error.message : "Refresh failed",
      lastErrorAt: new Date(),
    });
  }
};

/** Builds the current all-provider usage read model from latest snapshots. */
export const getUsageReadModel = async (db: Db, userId: string): Promise<ProviderUsage[]> => {
  const latest = await getLatestSnapshotIdsByUser(db, userId);
  const providers: ProviderUsage[] = [];
  for (const row of latest) {
    const usage = await getSnapshotWithWindows(db, row.snapshotId, userId);
    if (usage) providers.push(usage);
  }
  return providers;
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
  const entries = await listHistory(db, input);
  const items: ProviderUsage[] = [];
  for (const entry of entries) {
    const usage = await getSnapshotWithWindows(db, entry.snapshotId, input.userId);
    if (usage) items.push(usage);
  }
  const hasMore = items.length === input.limit;
  const nextCursor = hasMore ? entries[entries.length - 1]?.snapshotId ?? null : null;
  return { items, nextCursor, hasMore };
};
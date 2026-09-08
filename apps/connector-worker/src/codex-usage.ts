import { createHash } from "node:crypto";

import type { ProviderUsage } from "@devgauge/contracts";
import type { Db } from "@devgauge/database";
import { insertActivityDaily, insertSnapshot, insertWindows, setLatestUsage } from "@devgauge/database";

export const persistCodexUsage = async (
  db: Db,
  input: { userId: string; connectionId: string; usage: ProviderUsage; adapterVersion: string }
): Promise<string> => {
  const stableContent = {
    plan: input.usage.plan,
    windows: input.usage.windows,
    activity: input.usage.activity ?? null,
    dailyUsage: input.usage.dailyUsage ?? null,
    codex: input.usage.codex ?? null,
  };
  const snapshotId = await insertSnapshot(db, {
    userId: input.userId,
    connectionId: input.connectionId,
    provider: "codex",
    plan: input.usage.plan,
    contentHash: createHash("sha256").update(JSON.stringify(stableContent)).digest("hex"),
    source: input.usage.source,
    adapterVersion: input.adapterVersion,
    fetchedAt: input.usage.fetchedAt,
    capturedAt: null,
    stale: false,
    responseStatus: 200,
    activity: input.usage.activity ?? null,
    providerMetadata: input.usage.codex ?? null,
  });
  await insertWindows(db, snapshotId, input.usage.windows);
  for (const bucket of input.usage.dailyUsage ?? []) {
    await insertActivityDaily(db, {
      userId: input.userId,
      connectionId: input.connectionId,
      provider: "codex",
      date: bucket.startDate,
      tokens: bucket.tokens,
      source: input.usage.source,
    });
  }
  await setLatestUsage(db, {
    userId: input.userId,
    provider: "codex",
    connectionId: input.connectionId,
    snapshotId,
  });
  return snapshotId;
};

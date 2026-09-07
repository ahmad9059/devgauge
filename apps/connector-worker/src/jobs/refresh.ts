import type { Job } from "bullmq";
import { z } from "zod";

import type { ProviderUsage, UsageWindow } from "@devgauge/contracts";
import { providerIdSchema } from "@devgauge/contracts";
import type { Db } from "@devgauge/database";
import {
  createDb,
  getConnection,
  insertSnapshot,
  insertWindows,
  setLatestUsage,
} from "@devgauge/database";

import type { RefreshJobData } from "../queue.js";

export const refreshJobDataSchema = z.object({
  userId: z.string().uuid(),
  connectionId: z.string().min(1),
  provider: providerIdSchema,
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  attempt: z.number().int().nonnegative().default(0),
});

export type RefreshJobDataValidated = z.infer<typeof refreshJobDataSchema>;

const killSwitchEnvKey = (provider: string): string =>
  `KILLSWITCH_PROVIDER_${provider.toUpperCase().replaceAll("-", "_")}`;

let db: Db | null = null;
const getDb = (): Db | null => {
  if (!process.env.DATABASE_URL) return null;
  if (!db) db = createDb(process.env.DATABASE_URL);
  return db;
};

/** Minimal mock usage for Phase 4 scheduled-persistence proof; real adapters land in Phase 5. */
const mockUsage = (provider: string): ProviderUsage => {
  const hoursAhead = (h: number): string => new Date(Date.now() + h * 3_600_000).toISOString();
  const window = (id: string, label: string, usedPercent: number, resetsInHours: number): UsageWindow => ({
    id,
    label,
    usedPercent,
    remainingPercent: Math.max(0, 100 - usedPercent),
    used: null,
    limit: null,
    unit: "percent",
    windowSeconds: 5 * 3600,
    resetsAt: hoursAhead(resetsInHours),
    state: usedPercent >= 80 ? "warning" : "normal",
  });
  return {
    provider: provider as ProviderUsage["provider"],
    plan: "mock",
    windows: [window("rolling", "5 hour", 30, 3)],
    fetchedAt: new Date().toISOString(),
    source: "source-backed",
    stale: false,
  };
};

/**
 * Contract for every future provider refresh job.
 *
 * When a database is configured, the job persists a normalized snapshot so the
 * scheduled-refresh path is proven end to end (Phase 5+ swaps the mock for real
 * adapters and deduplicates by content hash). Without a database the job still
 * resolves so queue acknowledgement semantics remain testable in CI.
 */
export const refreshJobProcessor = async (job: Job<RefreshJobData>): Promise<unknown> => {
  const data = refreshJobDataSchema.parse(job.data);

  if (process.env[killSwitchEnvKey(data.provider)] === "true") {
    throw new Error(`Provider ${data.provider} is disabled by kill switch`);
  }

  const database = getDb();
  if (database) {
    const connection = await getConnection(database, data.userId, data.provider);
    if (connection) {
      const usage = mockUsage(data.provider);
      const snapshotId = await insertSnapshot(database, {
        userId: data.userId,
        connectionId: connection.id,
        provider: data.provider,
        plan: usage.plan,
        contentHash: `mock-${data.idempotencyKey}`,
        source: usage.source,
        adapterVersion: "phase4-worker-0.1.0",
        fetchedAt: usage.fetchedAt,
        capturedAt: null,
        stale: false,
        responseStatus: 200,
      });
      await insertWindows(database, snapshotId, usage.windows);
      await setLatestUsage(database, {
        userId: data.userId,
        provider: data.provider,
        connectionId: connection.id,
        snapshotId,
      });
    }
  }

  return {
    status: database ? "persisted" : "stub",
    provider: data.provider,
    connectionId: data.connectionId,
    idempotencyKey: data.idempotencyKey,
    requestId: data.requestId,
  };
};

/**
 * Echo processor proving at-least-once acknowledgement semantics: a job is
 * only acknowledged once its processor resolves.
 */
export const echoJobProcessor = async (job: Job<RefreshJobData>): Promise<unknown> => ({
  echoed: job.data,
});
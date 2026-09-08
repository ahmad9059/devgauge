import type { Job } from "bullmq";

import { PRODUCT_JOB_NAMES } from "@devgauge/contracts";
import { createDb, rollupAndRetainUsage, type Db } from "@devgauge/database";

let db: Db | null = null;
const getDb = (): Db => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for retention");
  if (!db) db = createDb(process.env.DATABASE_URL);
  return db;
};

/**
 * Idempotent daily rollup + retention pass. Rolls raw samples older than 90
 * days into daily min/max/last summaries, deletes raw rows once covered and
 * outside the operational latest pointer, retains daily rollups/activity
 * through 13 months, and purges expired deletion tombstones.
 */
export const rollupRetentionProcessor = async (job: Job): Promise<unknown> => {
  await rollupAndRetainUsage(getDb());
  return { status: "completed", jobName: job.name };
};

export const retentionJob = {
  name: PRODUCT_JOB_NAMES.rollupRetention,
  data: { requestId: "scheduled-retention", idempotencyKey: "daily-retention" },
};

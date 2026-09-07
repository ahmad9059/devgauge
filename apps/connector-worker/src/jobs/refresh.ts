import type { Job } from "bullmq";
import { z } from "zod";

import { providerIdSchema } from "@devgauge/contracts";

import type { RefreshJobData } from "../queue.js";

export const refreshJobDataSchema = z.object({
  connectionId: z.string().min(1),
  provider: providerIdSchema,
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  attempt: z.number().int().nonnegative().default(0),
});

export type RefreshJobDataValidated = z.infer<typeof refreshJobDataSchema>;

const killSwitchEnvKey = (provider: string): string =>
  `KILLSWITCH_PROVIDER_${provider.toUpperCase().replaceAll("-", "_")}`;

/**
 * Contract for every future provider refresh job.
 *
 * Phase 5+ wires the real provider adapters here. This skeleton validates the
 * job payload, applies the kill switch, and resolves a no-op success so the
 * queue's at-least-once acknowledgement path is exercised end to end.
 */
export const refreshJobProcessor = async (job: Job<RefreshJobData>): Promise<unknown> => {
  const data = refreshJobDataSchema.parse(job.data);

  if (process.env[killSwitchEnvKey(data.provider)] === "true") {
    throw new Error(`Provider ${data.provider} is disabled by kill switch`);
  }

  return {
    status: "stub",
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
import { z } from "zod";

import { EnvValidationError, validateEnvRecord } from "@devgauge/config";

export const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  QUEUE_REFRESH_NAME: z.string().min(1).default("refresh"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  KILLSWITCH_PROVIDER_OPENCODE_GO: z.string().default("false"),
  KILLSWITCH_PROVIDER_GITHUB_COPILOT: z.string().default("false"),
  KILLSWITCH_PROVIDER_CODEX: z.string().default("false"),
  KILLSWITCH_PROVIDER_CLAUDE_CODE: z.string().default("false"),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/**
 * Validate worker environment. The refresh queue requires Redis; a worker
 * without it must never start.
 */
export const validateWorkerEnv = (
  source: Record<string, string | undefined> = process.env
): WorkerEnv => {
  const env = validateEnvRecord(workerEnvSchema, source);

  if (env.NODE_ENV === "production") {
    const required = ["REDIS_URL"] as const;
    const missing = required.filter((key) => !source[key]);
    if (missing.length > 0) {
      throw new EnvValidationError(
        "Missing required production environment values.",
        missing.map((key) => `${key} required in production`)
      );
    }
  }
  return env;
};
import type { ZodIssue } from "zod";
import { z } from "zod";

import { EnvValidationError, validateEnvRecord } from "@devgauge/config";

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGINS: z.string().default(""),
  FEATURE_MOCK_TRANSPORT: z.string().default("false"),
  FLAG_PROVIDER_MUTATION_CODEX_RESET_CREDIT: z.string().default("false"),
  KILLSWITCH_PROVIDER_OPENCODE_GO: z.string().default("false"),
  KILLSWITCH_PROVIDER_GITHUB_COPILOT: z.string().default("false"),
  KILLSWITCH_PROVIDER_CODEX: z.string().default("false"),
  KILLSWITCH_PROVIDER_CLAUDE_CODE: z.string().default("false"),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export type _ZodIssueRef = ZodIssue;

/**
 * Validate API environment. In production, additional configuration that a
 * future phase connects (database, queue, secret store) is required so the
 * process fails closed instead of silently starting without them.
 */
export const validateApiEnv = (
  source: Record<string, string | undefined> = process.env
): ApiEnv => {
  const env = validateEnvRecord(apiEnvSchema, source);

  if (env.NODE_ENV === "production") {
    const required = ["DATABASE_URL", "REDIS_URL"] as const;
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
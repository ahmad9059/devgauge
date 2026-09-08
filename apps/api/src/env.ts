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
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  QUEUE_REFRESH_NAME: z.string().min(1).default("refresh"),
  ENC_MASTER_KEY: z.string().min(32).optional(),
  AUTH_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24 * 30),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional(),
  GITHUB_OAUTH_SCOPE: z.string().default("read:user"),
  COPILOT_RUNTIME_MODE: z.enum(["sandbox", "sdk"]).default("sandbox"),
  FEATURE_MOCK_TRANSPORT: z.string().default("true"),
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
    const required = ["DATABASE_URL", "ENC_MASTER_KEY", "REDIS_URL"] as const;
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

import { z } from "zod";

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[] = []) {
    super(message);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Parse and validate a typed environment schema against a source object
 * (defaults to `process.env`). Fails closed: any missing or invalid value
 * throws `EnvValidationError` before a process starts serving traffic.
 */
export const validateEnv = <T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env
): z.infer<T> => {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
    );
    throw new EnvValidationError(
      "Environment validation failed. Refusing to start with missing/invalid configuration.",
      issues
    );
  }
  return result.data;
};

export const validateEnvRecord = <T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown } },
  source: Record<string, string | undefined> = process.env
): T => {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      "Environment validation failed. Refusing to start with missing/invalid configuration."
    );
  }
  return result.data;
};

/**
 * Key fragments considered sensitive anywhere in logs, telemetry, and
 * error responses. Matching is case-insensitive substring.
 */
export const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "authorization",
  "client_secret",
  "access_token",
  "refresh_token",
  "device_code",
  "credential",
  "private_key",
  "session",
  "database_url",
  "redis_url",
] as const;

/** Recursively replaces sensitive values with a censor string. */
export const redactSecrets = <T>(
  value: T,
  fragments: readonly string[] = SENSITIVE_KEY_FRAGMENTS
): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecrets(entry, fragments)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        fragments.some((fragment) => key.toLowerCase().includes(fragment))
          ? "***REDACTED***"
          : redactSecrets(entry, fragments),
      ])
    ) as T;
  }
  return value;
};

/** Pino redact path patterns for the shared logger. */
export const LOG_REDACT_PATHS = [
  "req.headers.authorization",
  "headers.authorization",
  "authorization",
  "*.apiKey",
  "*.api_key",
  "*.clientSecret",
  "*.client_secret",
  "*.accessToken",
  "*.access_token",
  "*.refreshToken",
  "*.refresh_token",
  "*.deviceCode",
  "*.device_code",
  "*.password",
  "*.credential",
  "*.credentialEnvelope",
  "*.profileArtifact",
  "*.temporaryDirectory",
  "DATABASE_URL",
  "REDIS_URL",
];
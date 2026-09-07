import pino from "pino";

import { LOG_REDACT_PATHS } from "./env.js";

export type Logger = pino.Logger;

export interface CreateLoggerOptions {
  name: string;
  level?: string;
  redact?: string[];
}

/**
 * Shared structured logger. Sensitive values are redacted at serialization
 * time so credentials never reach logs, traces, or error output.
 */
export const createLogger = (options: CreateLoggerOptions): pino.Logger =>
  pino({
    name: options.name,
    level: options.level ?? process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [...LOG_REDACT_PATHS, ...(options.redact ?? [])],
      censor: "***REDACTED***",
    },
  });
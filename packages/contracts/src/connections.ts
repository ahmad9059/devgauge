import { z } from "zod";

import { errorCodeSchema } from "./errors.js";
import { providerIdSchema } from "./provider.js";

/** Connection lifecycle state for a single provider connection. */
export const connectionStateSchema = z.enum([
  "disconnected",
  "connecting",
  "connected",
  "degraded",
  "reauth_required",
  "revoking",
  "failed",
]);

export type ConnectionState = z.infer<typeof connectionStateSchema>;

/**
 * Refresh state is intentionally separate from connection state so a stale
 * quota fetch never implies the connection itself is broken.
 */
export const refreshStateSchema = z.enum([
  "idle",
  "queued",
  "running",
  "succeeded",
  "transient_failed",
  "permanent_failed",
  "contract_failed",
]);

export type RefreshState = z.infer<typeof refreshStateSchema>;

export const providerErrorInfoSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  retryable: z.boolean(),
});

export type ProviderErrorInfo = z.infer<typeof providerErrorInfoSchema>;

export const providerConnectionSchema = z.object({
  provider: providerIdSchema,
  state: connectionStateSchema,
  refresh: refreshStateSchema,
  plan: z.string().nullable(),
  adapterVersion: z.string(),
  lastVerifiedAt: z.string().datetime({ offset: true }).nullable(),
  lastError: providerErrorInfoSchema.nullable(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ProviderConnection = z.infer<typeof providerConnectionSchema>;
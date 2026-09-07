import { z } from "zod";

/**
 * Stable, provider-agnostic error taxonomy used by the API error envelope.
 * Each code maps to a distinct UI recovery action.
 */
export const ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "invalid_input",
  "provider_unauthorized",
  "entitlement_required",
  "provider_limited",
  "transient_upstream",
  "contract_drift",
  "disabled",
  "internal",
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
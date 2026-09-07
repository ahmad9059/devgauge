import type { ErrorCode, ErrorEnvelope } from "@devgauge/contracts";
import { errorEnvelopeSchema } from "@devgauge/contracts";

/**
 * Typed provider error mapped onto the shared error taxonomy. Adapters
 * throw these; infrastructure maps them to the API error envelope.
 */
export class ProviderError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }

  static transientUpstream(message: string, details?: Record<string, unknown>): ProviderError {
    return new ProviderError("transient_upstream", message, {
      retryable: true,
      ...(details ? { details } : {}),
    });
  }

  static contractDrift(message: string, details?: Record<string, unknown>): ProviderError {
    return new ProviderError("contract_drift", message, {
      ...(details ? { details } : {}),
    });
  }

  static providerUnauthorized(message: string): ProviderError {
    return new ProviderError("provider_unauthorized", message);
  }

  static entitlementRequired(message: string): ProviderError {
    return new ProviderError("entitlement_required", message);
  }

  static providerLimited(message: string): ProviderError {
    return new ProviderError("provider_limited", message);
  }
}

/** Builds a validated error envelope without leaking internal messages. */
export const toErrorEnvelope = (error: unknown, requestId: string): ErrorEnvelope => {
  if (error instanceof ProviderError) {
    return errorEnvelopeSchema.parse({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }
  return errorEnvelopeSchema.parse({
    error: { code: "internal", message: "Internal error", requestId },
  });
};

export const isTransient = (error: unknown): boolean =>
  error instanceof ProviderError && error.retryable;
export const PROVIDER_ERROR_CODES = [
  'offline',
  'timeout',
  'unauthorized',
  'forbidden',
  'rate_limited',
  'provider_unavailable',
  'schema_changed',
  'capability_disabled',
  'unsupported_account',
  'revocation_failed',
  'unknown',
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

/** Errors that may be retried with jittered backoff. */
export function isTransientCode(code: ProviderErrorCode): boolean {
  return (
    code === 'offline' || code === 'timeout' || code === 'provider_unavailable'
  );
}

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryAfterMs: number | null;
  readonly safeDetail: string | null;
  readonly httpStatus: number | null;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: {
      retryAfterMs?: number | null;
      safeDetail?: string | null;
      httpStatus?: number | null;
      cause?: unknown;
    } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'ProviderError';
    this.code = code;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.safeDetail = options.safeDetail ?? null;
    this.httpStatus = options.httpStatus ?? null;
  }
}

export function toProviderErrorCode(error: unknown): ProviderErrorCode {
  return error instanceof ProviderError ? error.code : 'unknown';
}

export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message =
    error instanceof Error ? error.message : 'Unknown provider error';
  return new ProviderError('unknown', message, { cause: error });
}

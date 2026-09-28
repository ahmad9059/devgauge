import { ProviderError } from '@/domain/errors';
import { parseRetryAfter } from '@/services/network/backoff';
import { NetworkError } from '@/services/network/client';

/** Maps an HTTP status to a provider error, or null when the status is OK. */
export function providerErrorForStatus(
  status: number,
  headers: Record<string, string>,
  now: Date,
): ProviderError | null {
  if (status === 401) {
    return new ProviderError('unauthorized', 'expired or invalid API key', {
      httpStatus: 401,
    });
  }
  if (status === 403) {
    return new ProviderError('forbidden', 'permission denied', {
      httpStatus: 403,
    });
  }
  if (status === 429) {
    const retryAt = parseRetryAfter(headers['retry-after'], now);
    return new ProviderError('rate_limited', 'provider rate limited', {
      retryAfterMs: retryAt ? retryAt.getTime() - now.getTime() : null,
      httpStatus: 429,
    });
  }
  if (status >= 500) {
    return new ProviderError('provider_unavailable', 'provider outage', {
      httpStatus: status,
    });
  }
  if (status !== 200) {
    return new ProviderError('unknown', `unexpected status ${status}`, {
      httpStatus: status,
    });
  }
  return null;
}

export function mapNetworkError(error: NetworkError): ProviderError {
  switch (error.code) {
    case 'timeout':
      return new ProviderError('timeout', error.safeDetail, { cause: error });
    case 'network':
      return new ProviderError('offline', error.safeDetail, { cause: error });
    case 'response-too-large':
      return new ProviderError(
        'schema_changed',
        'response exceeded the size cap',
        {
          cause: error,
        },
      );
    default:
      return new ProviderError('unknown', error.safeDetail, { cause: error });
  }
}

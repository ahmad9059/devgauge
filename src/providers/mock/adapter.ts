import { ProviderError } from '@/domain/errors';
import type { ProviderId } from '@/domain/providers';
import { parseRetryAfter } from '@/services/network/backoff';
import { NetworkError } from '@/services/network/client';
import type {
  ProviderAdapter,
  ProviderDescriptor,
  SupportTier,
} from '@/providers/types';

import { MOCK_BASE_URL, MOCK_USAGE_PATH } from './fixtures';
import { normalizeUsage } from './normalize';
import { rawUsageSchema } from './schema';

export type MockAdapterOptions = {
  id: ProviderId;
  baseUrl?: string;
  path?: string;
  allowlistedHosts?: string[];
  requiresCapabilityManifest?: boolean;
  supportTier?: SupportTier;
};

function mapNetworkError(error: NetworkError): ProviderError {
  switch (error.code) {
    case 'timeout':
      return new ProviderError('timeout', error.safeDetail, { cause: error });
    case 'response-too-large':
      return new ProviderError(
        'schema_changed',
        'response exceeded the size cap',
        {
          cause: error,
        },
      );
    case 'network':
      return new ProviderError('offline', error.safeDetail, { cause: error });
    default:
      return new ProviderError('unknown', error.safeDetail, { cause: error });
  }
}

/**
 * Deterministic adapter used by contract tests and E2E fixtures. It exercises
 * the real HTTP policy, schema validation, and normalization without touching a
 * real provider.
 */
export function createMockProviderAdapter(
  options: MockAdapterOptions,
): ProviderAdapter {
  const baseUrl = options.baseUrl ?? MOCK_BASE_URL;
  const path = options.path ?? MOCK_USAGE_PATH;
  const descriptor: ProviderDescriptor = {
    id: options.id,
    displayName: `Mock ${options.id}`,
    supportTier: options.supportTier ?? 'experimental',
    authModes: ['api-key'],
    capabilities: {
      liveUsage: true,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 0,
    allowlistedHosts: options.allowlistedHosts ?? [new URL(baseUrl).hostname],
    requiresCapabilityManifest: options.requiresCapabilityManifest ?? false,
  };

  return {
    descriptor,
    async fetchUsage(context) {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (context.credential.kind === 'api-key') {
        headers.Authorization = `Bearer ${context.credential.apiKey}`;
      }

      let response;
      try {
        response = await context.client.get({
          url: `${baseUrl}${path}`,
          headers,
          allowHosts: descriptor.allowlistedHosts,
          signal: context.signal,
        });
      } catch (error) {
        if (error instanceof NetworkError) throw mapNetworkError(error);
        throw new ProviderError('unknown', 'request failed', { cause: error });
      }

      if (response.status === 401) {
        throw new ProviderError('unauthorized', 'mock unauthorized', {
          httpStatus: 401,
        });
      }
      if (response.status === 403) {
        throw new ProviderError('forbidden', 'mock forbidden', {
          httpStatus: 403,
        });
      }
      if (response.status === 429) {
        const retryAt = parseRetryAfter(
          response.headers['retry-after'],
          context.now,
        );
        throw new ProviderError('rate_limited', 'mock rate limited', {
          retryAfterMs: retryAt
            ? retryAt.getTime() - context.now.getTime()
            : null,
          httpStatus: 429,
        });
      }
      if (response.status >= 500) {
        throw new ProviderError('provider_unavailable', 'mock provider error', {
          httpStatus: response.status,
        });
      }
      if (response.status !== 200) {
        throw new ProviderError(
          'unknown',
          `unexpected status ${response.status}`,
          {
            httpStatus: response.status,
          },
        );
      }

      let json: unknown;
      try {
        json = JSON.parse(response.body);
      } catch {
        throw new ProviderError(
          'schema_changed',
          'response was not valid JSON',
        );
      }
      const parsed = rawUsageSchema.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError(
          'schema_changed',
          'response failed validation',
          {
            safeDetail: parsed.error.issues
              .map((issue) => issue.path.join('.'))
              .join(','),
          },
        );
      }
      return normalizeUsage(parsed.data, context.now.toISOString());
    },
    async openFirstPartyUsage() {
      return null;
    },
  };
}

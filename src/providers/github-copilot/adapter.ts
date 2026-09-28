import { ProviderError } from '@/domain/errors';
import type { AccountIdentity, UsageWindow } from '@/domain/usage';
import type {
  NormalizedUsageResult,
  ProviderAdapter,
  ProviderDescriptor,
} from '@/providers/types';
import { parseRetryAfter } from '@/services/network/backoff';
import { NetworkError } from '@/services/network/client';

import {
  fetchGitHubBillingUsage,
  GITHUB_API_HOSTS,
  type GitHubAccountScope,
  type GitHubBillingKind,
} from './client';
import { normalizeGitHubBilling } from './normalize';
import { rawBillingUsageSchema } from './schema';

export const GITHUB_BILLING_KINDS: GitHubBillingKind[] = [
  'ai_credit',
  'premium_request',
];

export type GitHubCopilotAdapterOptions = {
  owner: string;
  scope: GitHubAccountScope;
  kinds?: GitHubBillingKind[];
};

function mapNetworkError(error: NetworkError): ProviderError {
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

export function githubCopilotDescriptor(): ProviderDescriptor {
  return {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    supportTier: 'candidate-supported',
    authModes: ['oauth-pkce', 'web-session'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: true,
      resetRedemption: false,
      organizationScope: true,
    },
    minimumRefreshIntervalSeconds: 300,
    allowlistedHosts: GITHUB_API_HOSTS,
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: 'https://github.com/settings/billing',
  };
}

/**
 * Personal and organization billing are separate connections with separate
 * endpoints; their windows are never merged or averaged together.
 */
export function createGitHubCopilotAdapter(
  options: GitHubCopilotAdapterOptions,
): ProviderAdapter {
  const kinds = options.kinds ?? GITHUB_BILLING_KINDS;

  return {
    descriptor: githubCopilotDescriptor(),
    async fetchUsage(context): Promise<NormalizedUsageResult> {
      if (context.credential.kind !== 'oauth') {
        throw new ProviderError(
          'unauthorized',
          'GitHub billing usage requires an OAuth user token',
        );
      }
      const accessToken = context.credential.accessToken;
      const windows: UsageWindow[] = [];
      let identity: AccountIdentity = {
        externalId: options.owner,
        displayName: options.owner,
        accountHint: null,
        scope: options.scope,
      };

      for (const kind of kinds) {
        let response;
        try {
          response = await fetchGitHubBillingUsage(context.client, {
            scope: options.scope,
            owner: options.owner,
            kind,
            accessToken,
            signal: context.signal,
          });
        } catch (error) {
          if (error instanceof NetworkError) throw mapNetworkError(error);
          throw new ProviderError('unknown', 'GitHub request failed', {
            cause: error,
          });
        }

        if (response.status === 401) {
          throw new ProviderError('unauthorized', 'GitHub rejected the token', {
            httpStatus: 401,
          });
        }
        if (response.status === 403) {
          throw new ProviderError('forbidden', 'GitHub permission denied', {
            httpStatus: 403,
          });
        }
        if (response.status === 404) {
          throw new ProviderError(
            'unsupported_account',
            'Billing usage is unavailable for this account or scope',
            { httpStatus: 404 },
          );
        }
        if (response.status === 429) {
          const retryAt = parseRetryAfter(
            response.headers['retry-after'],
            context.now,
          );
          throw new ProviderError('rate_limited', 'GitHub rate limited', {
            retryAfterMs: retryAt
              ? retryAt.getTime() - context.now.getTime()
              : null,
            httpStatus: 429,
          });
        }
        if (response.status >= 500) {
          throw new ProviderError(
            'provider_unavailable',
            'GitHub server error',
            {
              httpStatus: response.status,
            },
          );
        }
        if (response.status !== 200) {
          throw new ProviderError(
            'unknown',
            `Unexpected GitHub status ${response.status}`,
            { httpStatus: response.status },
          );
        }

        let json: unknown;
        try {
          json = JSON.parse(response.body);
        } catch {
          throw new ProviderError(
            'schema_changed',
            'GitHub response was not JSON',
          );
        }
        const parsed = rawBillingUsageSchema.safeParse(json);
        if (!parsed.success) {
          throw new ProviderError(
            'schema_changed',
            'GitHub usage failed validation',
            {
              safeDetail: parsed.error.issues
                .map((issue) => issue.path.join('.'))
                .join(','),
            },
          );
        }
        const normalized = normalizeGitHubBilling(parsed.data, {
          scope: options.scope,
          owner: options.owner,
          kind,
          now: context.now.toISOString(),
        });
        if (normalized.identity)
          identity = { ...identity, ...normalized.identity };
        windows.push(...normalized.windows);
      }

      return {
        identity,
        fetchedAt: context.now.toISOString(),
        schemaVersion: 1,
        isPartial: false,
        windows,
      };
    },
    async openFirstPartyUsage() {
      return 'https://github.com/settings/billing';
    },
  };
}

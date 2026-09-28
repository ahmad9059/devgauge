import { ProviderError } from '@/domain/errors';
import {
  contractGaps,
  experimentalUsageUrl,
  isContractVerified,
  userAgentHeader,
  type VendorContract,
} from '@/providers/experimental/contract';
import {
  mapNetworkError,
  providerErrorForStatus,
} from '@/providers/experimental/http-errors';
import type {
  NormalizedUsageResult,
  ProviderAdapter,
  ProviderDescriptor,
} from '@/providers/types';
import { NetworkError } from '@/services/network/client';

import { normalizeOpenCodeGoUsage } from './normalize';
import { openCodeGoUsageSchema } from './schema';

export type OpenCodeGoAdapterOptions = { contract?: VendorContract };

export function openCodeGoDescriptor(
  contract?: VendorContract,
): ProviderDescriptor {
  const verified = isContractVerified(contract);
  return {
    id: 'opencode-go',
    displayName: 'OpenCode Go',
    supportTier: 'experimental',
    authModes: ['api-key'],
    capabilities: {
      liveUsage: verified,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: verified
      ? contract.pollingLimitSeconds
      : 900,
    allowlistedHosts: verified ? contract.allowedHosts : [],
    requiresCapabilityManifest: true,
    firstPartyUsageUrl: 'https://opencode.ai/docs/go/',
  };
}

/**
 * OpenCode Go connector. Like Command Code, it makes no request without a
 * complete verified vendor contract.
 */
export function createOpenCodeGoAdapter(
  options: OpenCodeGoAdapterOptions = {},
): ProviderAdapter {
  const { contract } = options;
  return {
    descriptor: openCodeGoDescriptor(contract),
    async fetchUsage(context): Promise<NormalizedUsageResult> {
      if (!isContractVerified(contract)) {
        throw new ProviderError(
          'capability_disabled',
          `No verified OpenCode Go contract (${contractGaps(contract).join(', ') || 'unverified'})`,
        );
      }
      if (context.credential.kind !== 'api-key') {
        throw new ProviderError(
          'unauthorized',
          'OpenCode Go requires an API key',
        );
      }

      let response;
      try {
        response = await context.client.get({
          url: experimentalUsageUrl(contract),
          headers: {
            Authorization: `Bearer ${context.credential.apiKey}`,
            Accept: 'application/json',
            'User-Agent': userAgentHeader(),
          },
          allowHosts: contract.allowedHosts,
          signal: context.signal,
        });
      } catch (error) {
        if (error instanceof NetworkError) throw mapNetworkError(error);
        throw new ProviderError('unknown', 'OpenCode Go request failed', {
          cause: error,
        });
      }

      const statusError = providerErrorForStatus(
        response.status,
        response.headers,
        context.now,
      );
      if (statusError) throw statusError;

      let json: unknown;
      try {
        json = JSON.parse(response.body);
      } catch {
        throw new ProviderError(
          'schema_changed',
          'OpenCode Go response was not JSON',
        );
      }
      const parsed = openCodeGoUsageSchema.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError(
          'schema_changed',
          'OpenCode Go usage failed validation',
          {
            safeDetail: parsed.error.issues
              .map((issue) => issue.path.join('.'))
              .join(','),
          },
        );
      }
      return normalizeOpenCodeGoUsage(parsed.data, context.now.toISOString());
    },
    async openFirstPartyUsage() {
      return contract?.revocationUrl ?? null;
    },
  };
}

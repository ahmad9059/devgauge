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

import { normalizeCommandCodeUsage } from './normalize';
import { commandCodeUsageSchema } from './schema';

export type CommandCodeAdapterOptions = { contract?: VendorContract };

export function commandCodeDescriptor(
  contract?: VendorContract,
): ProviderDescriptor {
  const verified = isContractVerified(contract);
  return {
    id: 'command-code',
    displayName: 'Command Code',
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
    firstPartyUsageUrl: 'https://commandcode.ai/docs/resources/pricing-limits',
  };
}

/**
 * Command Code connector. It refuses to make any request until a complete,
 * verified vendor contract is supplied, so an unverified route can never become
 * a production integration.
 */
export function createCommandCodeAdapter(
  options: CommandCodeAdapterOptions = {},
): ProviderAdapter {
  const { contract } = options;
  return {
    descriptor: commandCodeDescriptor(contract),
    async fetchUsage(context): Promise<NormalizedUsageResult> {
      if (!isContractVerified(contract)) {
        throw new ProviderError(
          'capability_disabled',
          `No verified Command Code contract (${contractGaps(contract).join(', ') || 'unverified'})`,
        );
      }
      if (context.credential.kind !== 'api-key') {
        throw new ProviderError(
          'unauthorized',
          'Command Code requires an API key',
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
        throw new ProviderError('unknown', 'Command Code request failed', {
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
          'Command Code response was not JSON',
        );
      }
      const parsed = commandCodeUsageSchema.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError(
          'schema_changed',
          'Command Code usage failed validation',
          {
            safeDetail: parsed.error.issues
              .map((issue) => issue.path.join('.'))
              .join(','),
          },
        );
      }
      return normalizeCommandCodeUsage(parsed.data, context.now.toISOString());
    },
    async openFirstPartyUsage() {
      return contract?.revocationUrl ?? null;
    },
  };
}

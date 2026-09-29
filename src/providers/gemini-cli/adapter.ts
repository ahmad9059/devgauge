import type { ProviderAdapter, ProviderDescriptor } from '@/providers/types';
import { providerLink } from '@/services/links/provider-links';

export function geminiCliDescriptor(): ProviderDescriptor {
  return {
    id: 'gemini-cli',
    displayName: 'Antigravity',
    supportTier: 'blocked',
    authModes: ['manual', 'manual-import'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 0,
    allowlistedHosts: ['geminicli.com'],
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: providerLink('gemini-cli', 'usage') ?? undefined,
  };
}

/**
 * No live quota source is approved for Android, so there is no `fetchUsage`.
 * Figures come only from the explicit user-shared import flow.
 */
export function createGeminiCliAdapter(): ProviderAdapter {
  return {
    descriptor: geminiCliDescriptor(),
    async openFirstPartyUsage() {
      return providerLink('gemini-cli', 'usage');
    },
  };
}

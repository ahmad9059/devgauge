import type { ProviderAdapter, ProviderDescriptor } from '@/providers/types';
import { providerLink } from '@/services/links/provider-links';

export function claudeDescriptor(): ProviderDescriptor {
  return {
    id: 'claude',
    displayName: 'Claude',
    supportTier: 'blocked',
    authModes: ['manual'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 0,
    allowlistedHosts: ['claude.ai', 'support.claude.com'],
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: providerLink('claude', 'usage') ?? undefined,
  };
}

/** Manual-only until the Phase 1 Claude web-session gate passes. */
export function createClaudeAdapter(): ProviderAdapter {
  return {
    descriptor: claudeDescriptor(),
    async openFirstPartyUsage() {
      return providerLink('claude', 'usage');
    },
  };
}

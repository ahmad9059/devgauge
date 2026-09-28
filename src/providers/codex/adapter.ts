import type { ProviderAdapter, ProviderDescriptor } from '@/providers/types';
import { providerLink } from '@/services/links/provider-links';

export function codexDescriptor(): ProviderDescriptor {
  return {
    id: 'codex',
    displayName: 'Codex',
    supportTier: 'blocked',
    authModes: ['manual'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 0,
    allowlistedHosts: ['chatgpt.com'],
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: providerLink('codex', 'usage') ?? undefined,
  };
}

/**
 * Manual-only until the Phase 1 Codex web-session gate passes. The action opens
 * OpenAI's official page; it never resets quota.
 */
export function createCodexAdapter(): ProviderAdapter {
  return {
    descriptor: codexDescriptor(),
    async openFirstPartyUsage() {
      return providerLink('codex', 'usage');
    },
  };
}

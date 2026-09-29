import { PROVIDER_IDS, type ProviderId } from '@/domain/providers';
import type { ProviderAdapter, ProviderDescriptor } from './types';

export const providerDescriptors: Record<ProviderId, ProviderDescriptor> = {
  claude: {
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
    firstPartyUsageUrl: 'https://claude.ai/settings/usage',
  },
  codex: {
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
    firstPartyUsageUrl: 'https://chatgpt.com/codex/settings/usage',
  },
  'github-copilot': {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    supportTier: 'candidate-supported',
    authModes: ['web-session', 'oauth-pkce'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: true,
      resetRedemption: false,
      organizationScope: true,
    },
    minimumRefreshIntervalSeconds: 300,
    allowlistedHosts: ['api.github.com', 'github.com'],
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: 'https://github.com/settings/billing',
  },
  'command-code': {
    id: 'command-code',
    displayName: 'Command Code',
    supportTier: 'experimental',
    authModes: ['api-key'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 900,
    allowlistedHosts: [],
    requiresCapabilityManifest: true,
  },
  'opencode-go': {
    id: 'opencode-go',
    displayName: 'OpenCode Go',
    supportTier: 'experimental',
    authModes: ['api-key'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 900,
    allowlistedHosts: ['opencode.ai'],
    requiresCapabilityManifest: true,
  },
  'gemini-cli': {
    id: 'gemini-cli',
    displayName: 'Antigravity CLI',
    supportTier: 'blocked',
    authModes: ['manual', 'manual-import'],
    capabilities: {
      liveUsage: false,
      remoteRevocation: false,
      resetRedemption: false,
      organizationScope: false,
    },
    minimumRefreshIntervalSeconds: 0,
    allowlistedHosts: [],
    requiresCapabilityManifest: false,
    firstPartyUsageUrl: 'https://antigravity.google/product/antigravity-cli/',
  },
};

export function listProviderDescriptors(): ProviderDescriptor[] {
  return PROVIDER_IDS.map((id) => providerDescriptors[id]);
}

export function getProviderDescriptor(id: ProviderId): ProviderDescriptor {
  return providerDescriptors[id];
}

export class ProviderRegistry {
  private readonly adapters: Map<ProviderId, ProviderAdapter>;

  constructor(adapters: Partial<Record<ProviderId, ProviderAdapter>> = {}) {
    this.adapters = new Map(
      Object.entries(adapters).filter(([, value]) => value !== undefined) as [
        ProviderId,
        ProviderAdapter,
      ][],
    );
  }

  ids(): ProviderId[] {
    return [...PROVIDER_IDS];
  }

  descriptor(id: ProviderId): ProviderDescriptor {
    // A registered adapter is authoritative for its provider's runtime
    // capabilities; otherwise fall back to the registry-owned descriptor.
    return this.adapters.get(id)?.descriptor ?? providerDescriptors[id];
  }

  adapter(id: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  hasLiveAdapter(id: ProviderId): boolean {
    const adapter = this.adapters.get(id);
    return typeof adapter?.fetchUsage === 'function';
  }
}

export function createProviderRegistry(
  adapters: Partial<Record<ProviderId, ProviderAdapter>> = {},
): ProviderRegistry {
  return new ProviderRegistry(adapters);
}

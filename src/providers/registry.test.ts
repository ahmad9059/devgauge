import { describe, expect, it } from 'vitest';

import { PROVIDER_IDS } from '@/domain/providers';
import {
  createProviderRegistry,
  listProviderDescriptors,
  providerDescriptors,
} from '@/providers/registry';
import { createMockProviderAdapter } from '@/providers/mock/adapter';

describe('provider registry', () => {
  it('defines exactly the six closed provider ids', () => {
    const descriptors = listProviderDescriptors();
    expect(descriptors.map((descriptor) => descriptor.id)).toEqual([
      ...PROVIDER_IDS,
    ]);
    expect(descriptors).toHaveLength(6);
    expect(PROVIDER_IDS).toContain('gemini-cli');
  });

  it('keeps live usage off for blocked providers', () => {
    for (const id of ['claude', 'codex', 'gemini-cli'] as const) {
      expect(providerDescriptors[id].capabilities.liveUsage).toBe(false);
      expect(providerDescriptors[id].supportTier).toBe('blocked');
    }
  });

  it('requires a capability manifest only for experimental connectors', () => {
    for (const descriptor of listProviderDescriptors()) {
      if (descriptor.supportTier === 'experimental') {
        expect(descriptor.requiresCapabilityManifest).toBe(true);
      }
    }
    expect(providerDescriptors['command-code'].requiresCapabilityManifest).toBe(
      true,
    );
    expect(providerDescriptors['opencode-go'].requiresCapabilityManifest).toBe(
      true,
    );
  });

  it('gives each connector a first-party page or an allowlist', () => {
    expect(providerDescriptors.claude.firstPartyUsageUrl).toContain(
      'claude.ai',
    );
    expect(providerDescriptors.codex.firstPartyUsageUrl).toContain(
      'chatgpt.com',
    );
    expect(providerDescriptors['github-copilot'].allowlistedHosts).toContain(
      'api.github.com',
    );
    expect(providerDescriptors['github-copilot'].supportTier).toBe(
      'candidate-supported',
    );
  });

  it('reports whether a live adapter is registered per connection', () => {
    const registry = createProviderRegistry({
      claude: createMockProviderAdapter({ id: 'claude' }),
    });
    expect(registry.hasLiveAdapter('claude')).toBe(true);
    expect(registry.hasLiveAdapter('codex')).toBe(false);
    expect(registry.adapter('codex')).toBeUndefined();
  });
});

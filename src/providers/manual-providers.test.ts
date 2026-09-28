import { describe, expect, it } from 'vitest';

import {
  createClaudeAdapter,
  claudeDescriptor,
} from '@/providers/claude/adapter';
import { createCodexAdapter, codexDescriptor } from '@/providers/codex/adapter';
import {
  createGeminiCliAdapter,
  geminiCliDescriptor,
} from '@/providers/gemini-cli/adapter';
import { isAllowlistedLink } from '@/services/links/provider-links';
import type { ProviderAdapter, ProviderDescriptor } from '@/providers/types';

const adapters: Array<[ProviderDescriptor, ProviderAdapter]> = [
  [claudeDescriptor(), createClaudeAdapter()],
  [codexDescriptor(), createCodexAdapter()],
  [geminiCliDescriptor(), createGeminiCliAdapter()],
];

describe('manual/blocked providers', () => {
  it('are blocked with no live usage and a manual auth mode', () => {
    for (const [descriptor] of adapters) {
      expect(descriptor.supportTier).toBe('blocked');
      expect(descriptor.capabilities.liveUsage).toBe(false);
      expect(descriptor.authModes).toContain('manual');
    }
  });

  it('have no fetchUsage implementation', () => {
    for (const [, adapter] of adapters) {
      expect(adapter.fetchUsage).toBeUndefined();
    }
  });

  it('only open allowlisted first-party pages', async () => {
    for (const [descriptor, adapter] of adapters) {
      expect(descriptor.firstPartyUsageUrl).toBeDefined();
      expect(isAllowlistedLink(descriptor.firstPartyUsageUrl as string)).toBe(
        true,
      );
      const url = await adapter.openFirstPartyUsage?.();
      expect(url).toBeTruthy();
      expect(isAllowlistedLink(url as string)).toBe(true);
    }
  });
});

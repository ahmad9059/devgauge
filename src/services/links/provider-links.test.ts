import { describe, expect, it } from 'vitest';

import { PROVIDER_IDS } from '@/domain/providers';
import {
  allowlistedHosts,
  isAllowlistedLink,
  PROVIDER_LINKS,
  providerLink,
  requireProviderLink,
} from '@/services/links/provider-links';

describe('provider links', () => {
  it('uses only https links on a fixed allowlist', () => {
    for (const providerId of PROVIDER_IDS) {
      for (const url of Object.values(PROVIDER_LINKS[providerId])) {
        expect(isAllowlistedLink(url as string)).toBe(true);
      }
    }
    expect(allowlistedHosts()).toContain('claude.ai');
    expect(allowlistedHosts()).toContain('chatgpt.com');
  });

  it('returns null for a link the provider does not define', () => {
    expect(providerLink('claude', 'keys')).toBeNull();
    expect(() => requireProviderLink('claude', 'keys')).toThrow(
      /No allowlisted/,
    );
  });

  it('rejects a destination outside the allowlist', () => {
    expect(isAllowlistedLink('https://evil.test/usage')).toBe(false);
    expect(isAllowlistedLink('http://claude.ai/settings/usage')).toBe(false);
    expect(isAllowlistedLink('not a url')).toBe(false);
  });

  it('provides the Codex usage destination', () => {
    expect(requireProviderLink('codex', 'usage')).toBe(
      'https://chatgpt.com/codex/settings/usage',
    );
  });
});

import { describe, expect, it } from 'vitest';

import {
  MASKED_API_KEY,
  apiKeyRiskLevel,
  maskApiKey,
  requiresBroadKeyAcceptance,
  validateApiKey,
} from '@/features/connections/api-key';
import { experimentalDisclosure } from '@/features/connections/experimental';

describe('experimental disclosure', () => {
  it('states that no request is made until a contract is verified', () => {
    for (const providerId of ['command-code', 'opencode-go'] as const) {
      const disclosure = experimentalDisclosure(providerId);
      expect(disclosure.supportTier).toBe('experimental');
      expect(disclosure.summary).toMatch(/disabled until the vendor/);
      expect(disclosure.points.join(' ')).toMatch(/no network request/);
    }
  });

  it('warns about broad keys and explains revocation and the kill switch', () => {
    const disclosure = experimentalDisclosure('opencode-go');
    expect(disclosure.broadKeyWarning).toMatch(/spending/);
    expect(disclosure.revocation.instructions).toMatch(/Remove the key/);
    expect(disclosure.revocation.url).toContain('opencode.ai');
    expect(disclosure.killSwitchNote).toMatch(/never blocks local deletion/);
  });
});

describe('api key handling', () => {
  it('validates key format', () => {
    expect(validateApiKey('sk-abcdef123456')).toEqual({ ok: true });
    expect(validateApiKey('')).toMatchObject({ ok: false });
    expect(validateApiKey('short')).toMatchObject({ ok: false });
    expect(validateApiKey('has space in key')).toMatchObject({ ok: false });
  });

  it('masks a key without revealing its middle', () => {
    const key = 'sk-abcdef1234567890';
    const masked = maskApiKey(key);
    expect(masked).not.toContain('cdef1234');
    expect(masked).toContain(MASKED_API_KEY);
    expect(maskApiKey('shortkey')).toBe(MASKED_API_KEY);
  });

  it('treats unknown keys as broad and only read-only when confirmed', () => {
    expect(apiKeyRiskLevel()).toBe('broad');
    expect(apiKeyRiskLevel({ readOnly: false })).toBe('broad');
    expect(apiKeyRiskLevel({ readOnly: true })).toBe('read-only');
    expect(requiresBroadKeyAcceptance()).toBe(true);
    expect(requiresBroadKeyAcceptance({ readOnly: true })).toBe(false);
  });
});

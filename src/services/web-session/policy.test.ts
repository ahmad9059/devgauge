import { describe, expect, it } from 'vitest';

import {
  isWebSessionEnabled,
  WEB_SESSION_GATES,
  webSessionEnabled,
} from '@/services/web-session/policy';

describe('web session policy', () => {
  it('keeps every web-session flow disabled until Phase 1 passes', () => {
    for (const providerId of ['claude', 'codex', 'github-copilot'] as const) {
      expect(webSessionEnabled(providerId)).toBe(false);
    }
  });

  it('requires every gate before enabling a web session', () => {
    const base = WEB_SESSION_GATES.claude;
    expect(isWebSessionEnabled(base)).toBe(false);
    expect(
      isWebSessionEnabled({
        ...base,
        loginValidated: true,
        sessionPersistenceValidated: true,
        usageAccessValidated: true,
      }),
    ).toBe(false);
    expect(
      isWebSessionEnabled({
        ...base,
        loginValidated: true,
        sessionPersistenceValidated: true,
        usageAccessValidated: true,
        policyReviewed: true,
      }),
    ).toBe(true);
  });
});

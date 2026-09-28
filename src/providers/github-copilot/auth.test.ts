import { describe, expect, it } from 'vitest';

import { selectGitHubAuthMode } from '@/providers/github-copilot/auth';

describe('github auth decision', () => {
  it('prefers device flow with no broker by default', () => {
    const decision = selectGitHubAuthMode();
    expect(decision.mode).toBe('device-flow');
    expect(decision.brokerRequired).toBe(false);
    expect(decision.requestedScopes).toEqual([]);
  });

  it('uses the website session only after the Phase 1 gate passes', () => {
    const decision = selectGitHubAuthMode({ websiteSessionGatePassed: true });
    expect(decision.mode).toBe('web-session');
    expect(decision.brokerRequired).toBe(false);
  });
});

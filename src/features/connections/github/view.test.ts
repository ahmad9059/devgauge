import { describe, expect, it } from 'vitest';

import {
  githubConnectionView,
  githubUnsupportedAccountGuidance,
} from '@/features/connections/github/view';

describe('github connection view', () => {
  it('presents a clear release-disabled card', () => {
    const view = githubConnectionView();
    expect(view.state).toBe('candidate-disabled');
    expect(view.reason).toMatch(/Release-disabled/);
    expect(view.requestedPermissions).toHaveLength(1);
    expect(view.requestedPermissions[0]).toMatch(/Billing usage/);
  });

  it('keeps personal and organization as distinct, never-merged options', () => {
    const view = githubConnectionView();
    expect(view.accountScopeOptions.map((option) => option.value)).toEqual([
      'personal',
      'organization',
    ]);
    expect(
      view.consentPoints.some((point) => point.includes('never merged')),
    ).toBe(true);
  });

  it('states that no repository or code data is requested', () => {
    const view = githubConnectionView();
    expect(
      view.consentPoints.some((point) =>
        point.includes('No repository contents'),
      ),
    ).toBe(true);
  });

  it('provides actionable unsupported managed-account guidance', () => {
    expect(githubUnsupportedAccountGuidance()).toMatch(
      /organization or enterprise/,
    );
    expect(githubConnectionView().unsupportedGuidance).toMatch(/administrator/);
  });

  it('switches auth mode only when the website-session gate passes', () => {
    expect(githubConnectionView().authMode).toBe('device-flow');
    expect(
      githubConnectionView({ websiteSessionGatePassed: true }).authMode,
    ).toBe('web-session');
  });
});

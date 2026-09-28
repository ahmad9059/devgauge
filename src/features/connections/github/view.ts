import {
  selectGitHubAuthMode,
  type GitHubAuthMode,
} from '@/providers/github-copilot/auth';

export type GitHubAccountScopeOption = {
  value: 'personal' | 'organization';
  label: string;
  description: string;
};

export type GitHubConnectionView = {
  state: 'candidate-disabled';
  title: string;
  reason: string;
  authMode: GitHubAuthMode;
  brokerRequired: boolean;
  requestedPermissions: string[];
  permissionNote: string;
  consentPoints: string[];
  accountScopeOptions: GitHubAccountScopeOption[];
  unsupportedGuidance: string;
};

export function githubUnsupportedAccountGuidance(): string {
  return 'If Copilot is managed by an organization or enterprise, personal billing endpoints may be unavailable. Connect the organization scope with an administrator account instead.';
}

/**
 * Release-disabled presentation for GitHub Copilot. It states why the connector
 * is unavailable, shows personal vs organization as distinct choices, and lists
 * the minimum permission and consent copy before any sign-in.
 */
export function githubConnectionView(
  options: { websiteSessionGatePassed?: boolean } = {},
): GitHubConnectionView {
  const decision = selectGitHubAuthMode(options);
  return {
    state: 'candidate-disabled',
    title: 'GitHub Copilot',
    reason:
      'Release-disabled: the Android website-session feasibility and the GitHub App permission spike must pass before this connector can be enabled.',
    authMode: decision.mode,
    brokerRequired: decision.brokerRequired,
    requestedPermissions: ['Billing usage (read-only)'],
    permissionNote:
      'The exact GitHub App account permission is confirmed against the billing endpoints during the Phase 6 spike; no repository or code scope is requested.',
    consentPoints: [
      'DevGauge reads only billing usage: AI credits and premium requests.',
      'No repository contents, code, or profile data are requested.',
      'Personal and organization billing are separate connections and are never merged.',
      'You can disconnect at any time; DevGauge revokes the token and deletes it locally.',
    ],
    accountScopeOptions: [
      {
        value: 'personal',
        label: 'Personal account',
        description: 'For personally purchased Copilot plans.',
      },
      {
        value: 'organization',
        label: 'Organization',
        description: 'Requires organization administrator access.',
      },
    ],
    unsupportedGuidance: githubUnsupportedAccountGuidance(),
  };
}

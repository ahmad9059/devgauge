export type GitHubAuthMode = 'device-flow' | 'broker-pkce' | 'web-session';

export type GitHubAuthDecision = {
  mode: GitHubAuthMode;
  brokerRequired: boolean;
  requestedScopes: string[];
  reason: string;
};

/**
 * GitHub App user-to-server device flow needs only a client id, not a
 * confidential client secret, so no broker is required (Phase 6 spike decision).
 * The requested website-session flow stays a separate Phase 1-gated track and is
 * not selected until the Android session/policy review passes.
 */
export function selectGitHubAuthMode(
  options: { websiteSessionGatePassed?: boolean } = {},
): GitHubAuthDecision {
  if (options.websiteSessionGatePassed) {
    return {
      mode: 'web-session',
      brokerRequired: false,
      requestedScopes: [],
      reason: 'Phase 1 Android website-session gate passed.',
    };
  }
  return {
    mode: 'device-flow',
    brokerRequired: false,
    requestedScopes: [],
    reason:
      'Device flow uses a client id only, so no confidential broker exchange is needed. No repository or code scopes are requested.',
  };
}

export const GITHUB_OAUTH_BROKER_REQUIRED = false;

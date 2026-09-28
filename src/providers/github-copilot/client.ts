import type { HttpClient, HttpResponse } from '@/services/network/client';

export const GITHUB_API_HOSTS = ['api.github.com'];
export const GITHUB_API_VERSION = '2022-11-28';
export const GITHUB_USER_AGENT = 'devgauge/0.1.0';

export type GitHubBillingKind = 'ai_credit' | 'premium_request';
export type GitHubAccountScope = 'personal' | 'organization';

export function githubBillingUrl(
  scope: GitHubAccountScope,
  owner: string,
  kind: GitHubBillingKind,
): string {
  const encOwner = encodeURIComponent(owner);
  const segment = scope === 'personal' ? 'users' : 'organizations';
  return `https://api.github.com/${segment}/${encOwner}/settings/billing/${kind}/usage`;
}

export function githubHeaders(
  accessToken: string,
  options: { apiVersion?: string; userAgent?: string; accept?: string } = {},
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: options.accept ?? 'application/vnd.github+json',
    'X-GitHub-Api-Version': options.apiVersion ?? GITHUB_API_VERSION,
    'User-Agent': options.userAgent ?? GITHUB_USER_AGENT,
  };
}

export async function fetchGitHubBillingUsage(
  client: HttpClient,
  request: {
    scope: GitHubAccountScope;
    owner: string;
    kind: GitHubBillingKind;
    accessToken: string;
    signal: AbortSignal;
  },
): Promise<HttpResponse> {
  return client.get({
    url: githubBillingUrl(request.scope, request.owner, request.kind),
    headers: githubHeaders(request.accessToken),
    allowHosts: GITHUB_API_HOSTS,
    signal: request.signal,
  });
}

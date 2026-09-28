import type { ProviderId } from '@/domain/providers';

export type ProviderLinkKind = 'usage' | 'help' | 'billing' | 'keys';

/**
 * Fixed, allowlisted official destinations only. The app never opens a URL that
 * is not present here (no user- or provider-controlled destinations).
 */
export const PROVIDER_LINKS: Record<
  ProviderId,
  Partial<Record<ProviderLinkKind, string>>
> = {
  claude: {
    usage: 'https://claude.ai/settings/usage',
    help: 'https://support.claude.com/',
  },
  codex: {
    usage: 'https://chatgpt.com/codex/settings/usage',
    help: 'https://help.openai.com/',
  },
  'github-copilot': {
    usage: 'https://github.com/settings/billing',
    keys: 'https://github.com/settings/tokens',
  },
  'command-code': {
    usage: 'https://commandcode.ai/docs/resources/pricing-limits',
  },
  'opencode-go': {
    usage: 'https://opencode.ai/docs/go/',
  },
  'gemini-cli': {
    usage: 'https://geminicli.com/docs/resources/quota-and-pricing/',
    help: 'https://geminicli.com/docs/',
  },
};

const ALLOWED_HOSTS = new Set(
  Object.values(PROVIDER_LINKS)
    .flatMap((links) => Object.values(links))
    .map((url) => new URL(url as string).hostname),
);

export function providerLink(
  providerId: ProviderId,
  kind: ProviderLinkKind,
): string | null {
  return PROVIDER_LINKS[providerId][kind] ?? null;
}

export function requireProviderLink(
  providerId: ProviderId,
  kind: ProviderLinkKind,
): string {
  const link = providerLink(providerId, kind);
  if (!link) {
    throw new Error(`No allowlisted ${kind} link for ${providerId}`);
  }
  return link;
}

export function isAllowlistedLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function allowlistedHosts(): string[] {
  return [...ALLOWED_HOSTS].sort();
}

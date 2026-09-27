export type SpikeProvider = 'claude' | 'codex' | 'github-copilot';

export const spikeProviders: Record<
  SpikeProvider,
  { label: string; startUrl: string; allowedHosts: readonly string[] }
> = {
  claude: {
    label: 'Claude',
    startUrl: 'https://claude.ai/settings/usage',
    allowedHosts: [
      'claude.ai',
      'auth.anthropic.com',
      'accounts.google.com',
      'appleid.apple.com',
    ],
  },
  codex: {
    label: 'Codex',
    startUrl: 'https://chatgpt.com/codex/settings/usage',
    allowedHosts: [
      'chatgpt.com',
      'auth.openai.com',
      'accounts.google.com',
      'appleid.apple.com',
    ],
  },
  'github-copilot': {
    label: 'GitHub Copilot',
    startUrl: 'https://github.com/settings/billing',
    allowedHosts: ['github.com', 'login.microsoftonline.com'],
  },
};

export function allowedSpikeHost(
  provider: SpikeProvider,
  url: string,
): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return null;
    }
    return spikeProviders[provider].allowedHosts.includes(
      parsed.hostname.toLowerCase(),
    )
      ? parsed.hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

export function blockedSpikeHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      ? parsed.hostname.toLowerCase()
      : 'non-HTTPS navigation';
  } catch {
    return 'invalid navigation';
  }
}

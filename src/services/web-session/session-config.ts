import type { UsageWindowKind } from '@/domain/usage';

import type { WindowKeyMap } from './usage-extract';

export type SessionProviderId = 'claude' | 'codex' | 'github-copilot';

export type SessionProviderConfig = {
  label: string;
  /** First-party page whose session fetches the usage data. */
  usageUrl: string;
  allowedHosts: string[];
  keyMap: WindowKeyMap;
};

const WEEKLY: { label: string; kind: UsageWindowKind } = {
  label: 'Weekly',
  kind: 'weekly',
};
const FIVE_HOUR: { label: string; kind: UsageWindowKind } = {
  label: '5-hour window',
  kind: 'rolling',
};

export const SESSION_PROVIDERS: Record<
  SessionProviderId,
  SessionProviderConfig
> = {
  claude: {
    label: 'Claude',
    usageUrl: 'https://claude.ai/settings/usage',
    allowedHosts: [
      'claude.ai',
      'auth.anthropic.com',
      'accounts.google.com',
      'appleid.apple.com',
    ],
    keyMap: {
      five_hour: FIVE_HOUR,
      seven_day: WEEKLY,
      seven_day_opus: { label: 'Weekly (Opus)', kind: 'weekly' },
      seven_day_sonnet: { label: 'Weekly (Sonnet)', kind: 'weekly' },
    },
  },
  codex: {
    label: 'Codex',
    usageUrl: 'https://chatgpt.com/codex/settings/usage',
    allowedHosts: [
      'chatgpt.com',
      'auth.openai.com',
      'accounts.google.com',
      'appleid.apple.com',
    ],
    keyMap: {
      five_hour: FIVE_HOUR,
      primary: FIVE_HOUR,
      secondary: WEEKLY,
      weekly: WEEKLY,
    },
  },
  'github-copilot': {
    label: 'GitHub Copilot',
    usageUrl: 'https://github.com/settings/billing',
    allowedHosts: ['github.com', 'login.microsoftonline.com'],
    keyMap: {},
  },
};

export function isSessionProvider(id: string): id is SessionProviderId {
  return id === 'claude' || id === 'codex' || id === 'github-copilot';
}

/** Returns the matched hostname when navigation is allowlisted, else null. */
export function allowedSessionHost(
  providerId: SessionProviderId,
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
    const host = parsed.hostname.toLowerCase();
    const allowed = SESSION_PROVIDERS[providerId].allowedHosts.some(
      (entry) => host === entry || host.endsWith(`.${entry}`),
    );
    return allowed ? host : null;
  } catch {
    return null;
  }
}

/**
 * A standard mobile Chrome user-agent. Some first-party pages refuse to render
 * inside a bare WebView; presenting a normal browser UA keeps the real page.
 */
export const SESSION_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';

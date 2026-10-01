import type { UsageWindowKind } from '@/domain/usage';

import type { WindowKeyMap } from './usage-extract';

export type SessionProviderId =
  'claude' | 'codex' | 'github-copilot' | 'command-code' | 'opencode-go';

export type SessionProviderConfig = {
  label: string;
  /** First-party page whose session loads the usage data. */
  usageUrl: string;
  allowedHosts: string[];
  keyMap: WindowKeyMap;
};

const FIVE_HOUR: { label: string; kind: UsageWindowKind } = {
  label: '5-hour window',
  kind: 'rolling',
};
const WEEKLY: { label: string; kind: UsageWindowKind } = {
  label: 'Weekly',
  kind: 'weekly',
};
const MONTHLY: { label: string; kind: UsageWindowKind } = {
  label: 'Monthly',
  kind: 'monthly',
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
      // Codex presents both limit windows as percentage remaining, not used.
      primary: { ...FIVE_HOUR, remaining: true },
      primary_window: { ...FIVE_HOUR, remaining: true },
      five_hour: { ...FIVE_HOUR, remaining: true },
      rate_limit: { ...FIVE_HOUR, remaining: true },
      secondary: { ...WEEKLY, remaining: true },
      secondary_window: { ...WEEKLY, remaining: true },
      seven_day: { ...WEEKLY, remaining: true },
      weekly: { ...WEEKLY, remaining: true },
      workspace_monthly: {
        label: 'Workspace monthly credit limit',
        kind: 'monthly',
        remaining: true,
      },
    },
  },
  'github-copilot': {
    label: 'GitHub Copilot',
    // AI credit usage is shown on the Copilot features page.
    usageUrl: 'https://github.com/settings/copilot/features',
    allowedHosts: ['github.com', 'login.microsoftonline.com'],
    keyMap: {
      ai_credit: MONTHLY,
      premium_request: MONTHLY,
      credits: { label: 'Included credits', kind: 'monthly' },
      requests: { label: 'Premium requests', kind: 'monthly' },
    },
  },
  'command-code': {
    label: 'Command Code',
    // Usage lives in the Studio console (no documented HTTP usage API).
    usageUrl: 'https://commandcode.ai/usage',
    allowedHosts: ['commandcode.ai'],
    keyMap: {
      five_hour: FIVE_HOUR,
      hourly: FIVE_HOUR,
      weekly: WEEKLY,
      monthly: MONTHLY,
      credits: { label: 'Credits', kind: 'billing' },
    },
  },
  'opencode-go': {
    label: 'OpenCode Go',
    // Usage is tracked in the OpenCode console.
    usageUrl: 'https://opencode.ai/auth',
    allowedHosts: ['opencode.ai'],
    keyMap: {
      five_hour: FIVE_HOUR,
      weekly: WEEKLY,
      monthly: MONTHLY,
    },
  },
};

export function isSessionProvider(id: string): id is SessionProviderId {
  return id in SESSION_PROVIDERS;
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

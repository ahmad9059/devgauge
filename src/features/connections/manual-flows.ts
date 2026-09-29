import { PARTNER_API_WAITING } from '@/services/capabilities/partner';
import type { ProviderId } from '@/domain/providers';

export type ManualProviderId = 'claude' | 'codex' | 'gemini-cli';

/** Why a connector cannot fetch automatically, per provider. */
export function providerUnavailableExplanation(providerId: ProviderId): string {
  switch (providerId) {
    case 'claude':
    case 'codex':
      return automaticSyncExplanation(providerId);
    case 'gemini-cli':
      return automaticSyncExplanation('gemini-cli');
    case 'github-copilot':
      return 'GitHub Copilot is release-disabled until the Android website-session check and the GitHub App permission spike pass.';
    case 'command-code':
    case 'opencode-go':
      return 'This experimental connector stays off until the vendor issues a documented, read-only usage contract.';
  }
}

/** Plain-language explanation that never blames the user. */
export function automaticSyncExplanation(providerId: ManualProviderId): string {
  switch (providerId) {
    case 'claude':
      return 'Automatic Claude sync is not available yet. DevGauge can open the official Claude usage page and keep a local reset reminder on this device.';
    case 'codex':
      return 'Automatic Codex sync is not available yet. DevGauge can open the official Codex usage page and keep a local reset reminder on this device.';
    case 'gemini-cli':
      return 'Gemini CLI quota is shown only through figures you share from the CLI. They are labeled with their source and time and are not account-wide live usage.';
  }
}

/**
 * The Codex action opens the official page. It must never read as if DevGauge
 * resets or redeems quota.
 */
export function codexResetAction(): { label: string; note: string } {
  return {
    label: 'View usage and resets',
    note: "Opens OpenAI's official Codex usage page. DevGauge cannot reset or redeem your quota.",
  };
}

export const MANUAL_DATA_LABEL = 'User-provided';

export function manualDataLabelText(): string {
  return `${MANUAL_DATA_LABEL} · you can edit or remove this at any time`;
}

export function partnerApiWaitingState(): {
  title: string;
  description: string;
} {
  return {
    title: PARTNER_API_WAITING.title,
    description: PARTNER_API_WAITING.description,
  };
}

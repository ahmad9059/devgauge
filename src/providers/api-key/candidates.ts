import type { ProviderId } from '@/domain/providers';
import type { UsageWindowKind } from '@/domain/usage';

import type { WindowKeyMap } from '@/services/web-session/usage-extract';

export type ApiKeyCandidate = {
  /** Host the key is used against (allowlisted in the request). */
  host: string;
  url: string;
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
const CREDITS: { label: string; kind: UsageWindowKind } = {
  label: 'Credits',
  kind: 'billing',
};

/**
 * Candidate vendor endpoints for API-key connectors. These come from
 * implementation-oriented research in API.md and are NOT confirmed vendor
 * contracts, so the flow stays experimental and shows whatever the endpoint
 * returns (JSON or page text) without fabricating values.
 */
export const API_KEY_CANDIDATES: Partial<Record<ProviderId, ApiKeyCandidate>> =
  {
    'opencode-go': {
      host: 'opencode.ai',
      url: 'https://opencode.ai/zen/go/v1/usage',
      keyMap: {
        five_hour: FIVE_HOUR,
        weekly: WEEKLY,
        monthly: MONTHLY,
        credits: CREDITS,
      },
    },
    'command-code': {
      host: 'commandcode.ai',
      url: 'https://commandcode.ai/alpha/usage/summary',
      keyMap: {
        five_hour: FIVE_HOUR,
        primary: FIVE_HOUR,
        weekly: WEEKLY,
        secondary: WEEKLY,
        credits: CREDITS,
      },
    },
  };

export function isApiKeyProvider(id: string): id is ProviderId {
  return id in API_KEY_CANDIDATES;
}

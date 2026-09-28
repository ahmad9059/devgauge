import { compareVersions } from './manifest';

export type PartnerActivationInput = {
  /** Whether a signed manifest currently advertises the partner API. */
  manifestAllows: boolean;
  appVersion: string;
  minimumAppVersion: string;
  /** True only after legal/security review of a signed partner contract. */
  contractReviewed: boolean;
};

/**
 * A dormant partner API can only activate after a reviewed contract and an app
 * version that supports it. A remote manifest flag alone can never enable it
 * (ARCHITECTURE.md §9, phase-08 task 7).
 */
export function canActivatePartnerApi(input: PartnerActivationInput): boolean {
  if (!input.contractReviewed) return false;
  return compareVersions(input.appVersion, input.minimumAppVersion) >= 0;
}

export const PARTNER_API_WAITING = {
  title: 'Awaiting provider API',
  description:
    'Automatic sync needs an approved partner contract. Until then, DevGauge shows manual reminders and links to the official page.',
} as const;

import type {
  ProviderFixture,
  ProviderState,
  SupportTier,
} from '@/testing/fixtures/providers';
import type { StatusTone } from '@/design/themes';
import type { IconName } from '@/components/ui/icon';

export type StatusDescriptor = {
  tone: StatusTone;
  label: string;
  /** MaterialCommunityIcons glyph name. */
  icon: IconName;
  /** Short guidance shown on the card. */
  hint: string;
};

const STATUS: Record<ProviderState, StatusDescriptor> = {
  connected: {
    tone: 'success',
    label: 'Connected',
    icon: 'check-circle-outline',
    hint: 'Live usage from the provider.',
  },
  disconnected: {
    tone: 'neutral',
    label: 'Not connected',
    icon: 'plus-circle-outline',
    hint: 'Connect this provider to see usage.',
  },
  'candidate-disabled': {
    tone: 'neutral',
    label: 'Unavailable',
    icon: 'lock-outline',
    hint: 'Release-disabled until its contract is confirmed.',
  },
  experimental: {
    tone: 'accent',
    label: 'Experimental',
    icon: 'flask-outline',
    hint: 'Included for testing; data may be incomplete.',
  },
  blocked: {
    tone: 'danger',
    label: 'Awaiting provider API',
    icon: 'cloud-off-outline',
    hint: 'No approved usage source yet.',
  },
  stale: {
    tone: 'warning',
    label: 'Stale',
    icon: 'clock-alert-outline',
    hint: 'Showing the last stored snapshot.',
  },
  'rate-limited': {
    tone: 'warning',
    label: 'Rate limited',
    icon: 'timer-sand',
    hint: 'Refresh paused after a rate-limit response.',
  },
  'auth-expired': {
    tone: 'warning',
    label: 'Sign in again',
    icon: 'lock-reset',
    hint: 'The stored session is no longer valid.',
  },
  error: {
    tone: 'danger',
    label: 'Error',
    icon: 'alert-circle-outline',
    hint: 'The last refresh failed.',
  },
};

export function describeState(state: ProviderState): StatusDescriptor {
  return STATUS[state];
}

export const TIER_LABELS: Record<SupportTier, string> = {
  supported: 'Supported',
  experimental: 'Experimental',
  blocked: 'Awaiting provider API',
};

export type SourceLabel = 'Live' | 'Manual' | 'None';

export function describeSource(source: ProviderFixture['source']): SourceLabel {
  if (source === 'live') return 'Live';
  if (source === 'manual') return 'Manual';
  return 'None';
}

/** Blocked/candidate providers never show a fake login control. */
export function allowsConnection(state: ProviderState): boolean {
  return (
    state === 'disconnected' ||
    state === 'experimental' ||
    state === 'auth-expired' ||
    state === 'rate-limited' ||
    state === 'error'
  );
}

export type ConnectorGroup =
  'available' | 'candidate' | 'experimental' | 'blocked';

export const CONNECTOR_GROUP_LABELS: Record<ConnectorGroup, string> = {
  available: 'Available now',
  candidate: 'Candidate / release-disabled',
  experimental: 'Experimental',
  blocked: 'Awaiting provider API',
};

export function connectorGroup(state: ProviderState): ConnectorGroup {
  switch (state) {
    case 'auth-expired':
    case 'rate-limited':
    case 'error':
    case 'connected':
    case 'stale':
      return 'available';
    case 'disconnected':
      return 'available';
    case 'candidate-disabled':
      return 'candidate';
    case 'experimental':
      return 'experimental';
    case 'blocked':
      return 'blocked';
  }
}

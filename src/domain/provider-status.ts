import type {
  ProviderView,
  ProviderState,
  SupportTier,
} from '@/features/dashboard/provider-view-types';
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
    hint: 'Not available in this build.',
  },
  experimental: {
    tone: 'accent',
    label: 'Limited',
    icon: 'flask-outline',
    hint: 'Limited availability.',
  },
  blocked: {
    tone: 'neutral',
    label: 'Unavailable',
    icon: 'cloud-off-outline',
    hint: 'Not available yet.',
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
  experimental: 'Limited',
  blocked: 'Unavailable',
};

export type SourceLabel = 'Live' | 'Manual' | 'None';

export function describeSource(source: ProviderView['source']): SourceLabel {
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
  available: 'Available',
  candidate: 'Unavailable',
  experimental: 'Limited',
  blocked: 'Unavailable',
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

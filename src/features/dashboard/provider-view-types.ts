// Production view models; fixtures import these types, never the reverse.
import type { ProviderId } from '@/domain/providers';

export type { ProviderId };

export type SupportTier = 'supported' | 'experimental' | 'blocked';

export type ProviderState =
  | 'connected'
  | 'disconnected'
  | 'candidate-disabled'
  | 'experimental'
  | 'blocked'
  | 'stale'
  | 'rate-limited'
  | 'auth-expired'
  | 'error';

export type UsageUnit =
  'percent' | 'requests' | 'credits' | 'tokens' | 'currency';

export type UsageWindowKind =
  'rolling' | 'daily' | 'weekly' | 'monthly' | 'billing-period';

export type UsageWindow = {
  kind: UsageWindowKind;
  label: string;
  /** Shared pool shown as a section on the provider detail page. */
  group?: string;
  unit: UsageUnit;
  used?: number;
  limit?: number;
  remaining?: number;
  percent?: number;
  externalKey?: string;
  resetsAt?: string;
  resetDue?: boolean;
  resetsInMinutes?: number;
  /** Raw reset text when the source does not give a parseable timestamp. */
  resetsText?: string;
};

export type ProviderView = {
  id: ProviderId;
  displayName: string;
  /** Neutral monogram until official brand assets are approved. */
  monogram: string;
  planName?: string;
  tier: SupportTier;
  state: ProviderState;
  source: 'live' | 'manual' | 'none';
  connectionId?: string;
  fetchedAt?: string;
  updatedMinutesAgo?: number;
  windows: UsageWindow[];
  note?: string;
  /** First-party page the user can open instead of a fake login control. */
  dashboardUrl?: string;
};

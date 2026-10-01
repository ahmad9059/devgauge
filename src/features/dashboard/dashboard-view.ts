import type { ProviderId } from '@/domain/providers';
import type { ProviderDescriptor, SupportTier } from '@/providers/types';
import type { ProviderConnection, SnapshotWithWindows } from '@/storage/types';
import type { ProviderState } from '@/features/dashboard/provider-view-types';

import {
  formatDecimalValue,
  formatLimit,
  formatPercent,
  freshnessLabel,
} from './format';

const MANUAL_AUTH = new Set(['manual', 'manual-import']);
const ATTENTION_STATES: ProviderState[] = [
  'stale',
  'auth-expired',
  'rate-limited',
  'error',
];
export const DEFAULT_TTL_SECONDS = 300;

export type DashboardWindow = {
  key: string;
  label: string;
  usedText: string;
  limitText: string;
  percentText: string;
  resetsAt: string | null;
  unknown: boolean;
};

export type DashboardCard = {
  providerId: ProviderId;
  displayName: string;
  supportTier: SupportTier;
  monogram: string;
  state: ProviderState;
  source: 'live' | 'manual' | 'none';
  freshness: string;
  windows: DashboardWindow[];
  connectionCount: number;
  isManual: boolean;
};

export type DashboardSummary = {
  nearLimit: number;
  needsAttention: number;
  nextResetAt: string | null;
};

export type DashboardView = {
  cards: DashboardCard[];
  summary: DashboardSummary;
};

export type DashboardInput = {
  descriptors: ProviderDescriptor[];
  connections: ProviderConnection[];
  latest: Map<string, SnapshotWithWindows>;
  now: Date;
  ttlSeconds?: number;
};

function monogram(displayName: string): string {
  const letters = displayName.replace(/[^A-Za-z]/g, '');
  return (letters.slice(0, 2) || displayName.slice(0, 2)).toUpperCase();
}

function newest(
  connections: ProviderConnection[],
): ProviderConnection | undefined {
  return [...connections].sort((a, b) =>
    (b.lastAttemptAt ?? b.createdAt).localeCompare(
      a.lastAttemptAt ?? a.createdAt,
    ),
  )[0];
}

/** All connections for a provider. A second scope is never silently dropped. */
export function accountOptions(
  connections: ProviderConnection[],
  providerId: ProviderId,
): ProviderConnection[] {
  return connections.filter(
    (connection) => connection.providerId === providerId,
  );
}

export function hasMultipleAccountScopes(
  connections: ProviderConnection[],
  providerId: ProviderId,
): boolean {
  return accountOptions(connections, providerId).length > 1;
}

export function deriveProviderState(
  descriptor: ProviderDescriptor,
  connections: ProviderConnection[],
  latest: Map<string, SnapshotWithWindows>,
  now: Date,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): ProviderState {
  const connectionsForProvider = accountOptions(connections, descriptor.id);
  if (connectionsForProvider.length === 0) {
    switch (descriptor.supportTier) {
      case 'blocked':
        return 'blocked';
      case 'candidate-supported':
        return 'candidate-disabled';
      case 'experimental':
        return 'experimental';
      default:
        return 'disconnected';
    }
  }

  const active = newest(connectionsForProvider);
  if (!active) return 'disconnected';
  if (active.status === 'expired') return 'auth-expired';
  if (active.status === 'error') return 'error';
  if (active.status === 'disconnected') return 'disconnected';
  if (
    active.nextAllowedRefreshAt !== null &&
    Date.parse(active.nextAllowedRefreshAt) > now.getTime()
  ) {
    return 'rate-limited';
  }

  const snapshot = latest.get(active.id);
  if (!snapshot) return 'disconnected';
  if (MANUAL_AUTH.has(active.authMode)) return 'connected';
  const ageMs = now.getTime() - Date.parse(snapshot.fetchedAt);
  return ageMs > ttlSeconds * 1000 ? 'stale' : 'connected';
}

export function buildDashboardView(input: DashboardInput): DashboardView {
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  let nearLimit = 0;

  const cards: DashboardCard[] = input.descriptors.map((descriptor) => {
    const connectionsForProvider = accountOptions(
      input.connections,
      descriptor.id,
    );
    const active = newest(connectionsForProvider);
    const snapshot = active ? input.latest.get(active.id) : undefined;
    const manual = active !== undefined && MANUAL_AUTH.has(active.authMode);

    const windows: DashboardWindow[] = (snapshot?.windows ?? []).map(
      (window) => ({
        key: window.externalKey,
        label: window.label,
        usedText: formatDecimalValue(window.usedDecimal, window.unit),
        limitText: formatLimit(window.limitDecimal, window.unit),
        percentText: formatPercent(window.utilization),
        resetsAt: window.resetsAt,
        unknown: window.usedDecimal === null && window.limitDecimal === null,
      }),
    );

    if (
      (snapshot?.windows ?? []).some(
        (window) => window.utilization !== null && window.utilization >= 0.8,
      )
    ) {
      nearLimit += 1;
    }

    return {
      providerId: descriptor.id,
      displayName: descriptor.displayName,
      supportTier: descriptor.supportTier,
      monogram: monogram(descriptor.displayName),
      state: deriveProviderState(
        descriptor,
        input.connections,
        input.latest,
        input.now,
        ttlSeconds,
      ),
      source: snapshot ? snapshot.source : manual ? 'manual' : 'none',
      freshness: freshnessLabel(
        snapshot?.fetchedAt ?? active?.lastSuccessAt ?? null,
        input.now,
      ),
      windows,
      connectionCount: connectionsForProvider.length,
      isManual: snapshot?.source === 'manual',
    };
  });

  const resetTimes = cards
    .flatMap((card) => card.windows.map((window) => window.resetsAt))
    .filter(
      (value): value is string =>
        value !== null && Number.isFinite(Date.parse(value)),
    );

  return {
    cards,
    summary: {
      nearLimit,
      needsAttention: cards.filter((card) =>
        ATTENTION_STATES.includes(card.state),
      ).length,
      nextResetAt:
        resetTimes.length > 0
          ? resetTimes.reduce((earliest, value) =>
              Date.parse(value) < Date.parse(earliest) ? value : earliest,
            )
          : null,
    },
  };
}

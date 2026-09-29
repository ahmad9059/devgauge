import type { ProviderDescriptor } from '@/providers/types';
import type {
  ProviderConnection,
  SnapshotWithWindows,
  UsageWindowRecord,
} from '@/storage/types';
import type {
  ProviderFixture,
  ProviderState,
  SupportTier as FixtureTier,
  UsageWindow as FixtureWindow,
  UsageWindowKind as FixtureWindowKind,
} from '@/testing/fixtures/providers';

import { deriveProviderState, DEFAULT_TTL_SECONDS } from './dashboard-view';

export type ProviderViewsInput = {
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

function fixtureTier(tier: ProviderDescriptor['supportTier']): FixtureTier {
  if (tier === 'experimental') return 'experimental';
  if (tier === 'blocked') return 'blocked';
  return 'supported';
}

function fixtureKind(kind: UsageWindowRecord['kind']): FixtureWindowKind {
  return kind === 'billing' ? 'billing-period' : kind;
}

function minutesAgo(iso: string | null, now: Date): number | undefined {
  if (!iso) return undefined;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return undefined;
  const minutes = Math.round((now.getTime() - parsed) / 60_000);
  return minutes >= 0 ? minutes : undefined;
}

function toNumber(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toFixtureWindow(window: UsageWindowRecord, now: Date): FixtureWindow {
  const parsedReset = window.resetsAt ? Date.parse(window.resetsAt) : NaN;
  const resetsInMinutes = Number.isFinite(parsedReset)
    ? Math.max(0, Math.round((parsedReset - now.getTime()) / 60_000))
    : undefined;
  return {
    kind: fixtureKind(window.kind),
    label: window.label,
    unit: window.unit,
    used: toNumber(window.usedDecimal),
    limit: toNumber(window.limitDecimal),
    remaining: toNumber(window.remainingDecimal),
    percent:
      window.utilization === null
        ? undefined
        : Math.round(window.utilization * 1000) / 10,
    resetsInMinutes,
    resetsText:
      window.resetsAt !== null && resetsInMinutes === undefined
        ? window.resetsAt
        : undefined,
  };
}

function noteFor(state: ProviderState): string | undefined {
  switch (state) {
    case 'blocked':
      return 'No approved usage source for DevGauge yet.';
    case 'candidate-disabled':
      return 'Release-disabled until its feasibility gate passes.';
    case 'experimental':
      return 'Disabled until the vendor confirms a read-only usage contract.';
    case 'stale':
      return 'Showing the last stored snapshot.';
    case 'rate-limited':
      return 'Refresh paused after a rate limit.';
    case 'auth-expired':
      return 'Sign in again to resume refresh.';
    case 'error':
      return 'The last refresh failed.';
    default:
      return undefined;
  }
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

/**
 * Builds the UI's provider shape from the real registry descriptors, stored
 * connections, and latest snapshots. There is no static/demo usage data: a
 * provider only shows windows when it has a persisted snapshot.
 */
export function buildProviderViews(
  input: ProviderViewsInput,
): ProviderFixture[] {
  return input.descriptors.map((descriptor) => {
    const connections = input.connections.filter(
      (connection) => connection.providerId === descriptor.id,
    );
    const active = newest(connections);
    const snapshot = active ? input.latest.get(active.id) : undefined;
    const state = deriveProviderState(
      descriptor,
      input.connections,
      input.latest,
      input.now,
      input.ttlSeconds ?? DEFAULT_TTL_SECONDS,
    );
    const source: ProviderFixture['source'] = snapshot
      ? snapshot.source
      : active !== undefined &&
          (active.authMode === 'manual' || active.authMode === 'manual-import')
        ? 'manual'
        : 'none';

    return {
      id: descriptor.id,
      displayName: descriptor.displayName,
      monogram: monogram(descriptor.displayName),
      planName: active?.displayName ?? undefined,
      tier: fixtureTier(descriptor.supportTier),
      state,
      source,
      updatedMinutesAgo: minutesAgo(
        snapshot?.fetchedAt ?? active?.lastSuccessAt ?? null,
        input.now,
      ),
      windows: (snapshot?.windows ?? []).map((window) =>
        toFixtureWindow(window, input.now),
      ),
      note: noteFor(state),
      dashboardUrl: descriptor.firstPartyUsageUrl,
    };
  });
}

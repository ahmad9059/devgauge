import { describe, expect, it } from 'vitest';

import {
  accountOptions,
  buildDashboardView,
  deriveProviderState,
  hasMultipleAccountScopes,
} from '@/features/dashboard/dashboard-view';
import { listProviderDescriptors } from '@/providers/registry';
import type { ProviderId } from '@/domain/providers';
import type { SnapshotWithWindows } from '@/storage/types';
import {
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const descriptors = listProviderDescriptors();
const descriptor = (id: ProviderId) => {
  const found = descriptors.find((item) => item.id === id);
  if (!found) throw new Error(`missing descriptor ${id}`);
  return found;
};

function snapshot(
  connectionId: string,
  overrides: Parameters<typeof makeSnapshot>[1] = {},
  windows: ReturnType<typeof makeWindow>[] = [],
): SnapshotWithWindows {
  const record = makeSnapshot(connectionId, overrides);
  return {
    ...record,
    windows: windows.map((window) => ({ ...window, snapshotId: record.id })),
  };
}

describe('dashboard view', () => {
  it('renders release states for providers without connections', () => {
    const view = buildDashboardView({
      descriptors,
      connections: [],
      latest: new Map(),
      now: NOW,
    });
    const state = (id: ProviderId) =>
      view.cards.find((card) => card.providerId === id)?.state;
    expect(state('claude')).toBe('blocked');
    expect(state('codex')).toBe('blocked');
    expect(state('gemini-cli')).toBe('blocked');
    expect(state('github-copilot')).toBe('candidate-disabled');
    expect(state('command-code')).toBe('experimental');
    expect(state('opencode-go')).toBe('experimental');
  });

  it('derives fresh, stale, rate-limited, expired, and error states', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const fresh = snapshot('c1', { fetchedAt: '2026-09-27T23:59:00.000Z' }, []);
    expect(
      deriveProviderState(
        descriptor('claude'),
        [connection],
        new Map([['c1', fresh]]),
        NOW,
        300,
      ),
    ).toBe('connected');

    const stale = { ...fresh, fetchedAt: '2026-09-27T20:00:00.000Z' };
    expect(
      deriveProviderState(
        descriptor('claude'),
        [connection],
        new Map([['c1', stale]]),
        NOW,
        300,
      ),
    ).toBe('stale');

    const rateLimited = makeConnection({
      id: 'c1',
      providerId: 'claude',
      nextAllowedRefreshAt: '2026-09-28T01:00:00.000Z',
    });
    expect(
      deriveProviderState(
        descriptor('claude'),
        [rateLimited],
        new Map([['c1', fresh]]),
        NOW,
      ),
    ).toBe('rate-limited');

    expect(
      deriveProviderState(
        descriptor('claude'),
        [makeConnection({ id: 'c1', providerId: 'claude', status: 'expired' })],
        new Map([['c1', fresh]]),
        NOW,
      ),
    ).toBe('auth-expired');

    expect(
      deriveProviderState(
        descriptor('claude'),
        [makeConnection({ id: 'c1', providerId: 'claude', status: 'error' })],
        new Map([['c1', fresh]]),
        NOW,
      ),
    ).toBe('error');
  });

  it('treats a user-shared manual snapshot as connected', () => {
    const manual = makeConnection({
      id: 'g1',
      providerId: 'gemini-cli',
      authMode: 'manual',
      credentialRef: null,
    });
    const manualSnapshot = snapshot('g1', { id: 'sg', source: 'manual' }, []);
    expect(
      deriveProviderState(
        descriptor('gemini-cli'),
        [manual],
        new Map([['g1', manualSnapshot]]),
        NOW,
      ),
    ).toBe('connected');
  });

  it('never drops a second account scope', () => {
    const personal = makeConnection({
      id: 'p1',
      providerId: 'github-copilot',
      accountScope: 'personal',
      canonicalAccountKey: 'gh:personal',
    });
    const organization = makeConnection({
      id: 'o1',
      providerId: 'github-copilot',
      accountScope: 'organization',
      canonicalAccountKey: 'gh:org',
    });
    expect(
      accountOptions([personal, organization], 'github-copilot'),
    ).toHaveLength(2);
    expect(
      hasMultipleAccountScopes([personal, organization], 'github-copilot'),
    ).toBe(true);
  });

  it('formats unknown values and computes the summary', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record = snapshot('c1', { fetchedAt: NOW.toISOString() }, [
      makeWindow('s', {
        externalKey: 'unknown',
        label: 'Monthly',
        usedDecimal: null,
        limitDecimal: null,
        utilization: null,
        unit: 'requests',
        resetsAt: null,
      }),
      makeWindow('s', {
        externalKey: 'near',
        label: 'Weekly',
        usedDecimal: '90',
        limitDecimal: '100',
        utilization: 0.9,
        unit: 'percent',
        resetsAt: '2026-09-28T02:00:00.000Z',
      }),
    ]);
    const view = buildDashboardView({
      descriptors,
      connections: [connection],
      latest: new Map([['c1', record]]),
      now: NOW,
    });
    const card = view.cards.find((item) => item.providerId === 'claude');
    expect(card?.windows[0].usedText).toBe('—');
    expect(card?.windows[0].limitText).toBe('unknown limit');
    expect(card?.windows[0].unknown).toBe(true);
    expect(card?.isManual).toBe(false);
    expect(view.summary.nearLimit).toBe(1);
    expect(view.summary.nextResetAt).toBe('2026-09-28T02:00:00.000Z');
  });
});

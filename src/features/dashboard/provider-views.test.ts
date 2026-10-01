import { describe, expect, it } from 'vitest';

import { buildProviderViews } from '@/features/dashboard/provider-views';
import { listProviderDescriptors } from '@/providers/registry';
import type { SnapshotWithWindows } from '@/storage/types';
import {
  makeConnection,
  makeSnapshot,
  makeWindow,
} from '@/testing/storage/factory';

const NOW = new Date('2026-09-28T00:00:00.000Z');
const descriptors = listProviderDescriptors();

describe('provider views (real data source)', () => {
  it('recovers a saved Claude microsecond reset into a countdown instead of displaying ISO text', () => {
    const now = new Date('2026-10-01T18:00:00Z');
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record: SnapshotWithWindows = {
      ...makeSnapshot('c1', { id: 's1', fetchedAt: now.toISOString() }),
      windows: [
        makeWindow('s1', {
          resetsAt: null,
          resetsSourceText: '2026-10-01T19:20:00.300723+00:00',
        }),
      ],
    };
    const view = buildProviderViews({
      descriptors,
      connections: [connection],
      latest: new Map([['c1', record]]),
      now,
    }).find((item) => item.id === 'claude')!;
    expect(view.windows[0].resetsAt).toBe('2026-10-01T19:20:00.300Z');
    expect(view.windows[0].resetsInMinutes).toBe(80);
    expect(view.windows[0].resetsText).toBeUndefined();
  });
  it('keeps a newly captured snapshot just now until a full minute has elapsed', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record = {
      ...makeSnapshot('c1', { fetchedAt: NOW.toISOString() }),
      windows: [],
    };
    const ageAt = (seconds: number) =>
      buildProviderViews({
        descriptors,
        connections: [connection],
        latest: new Map([['c1', record]]),
        now: new Date(NOW.getTime() + seconds * 1000),
      }).find((item) => item.id === 'claude')!.updatedMinutesAgo;
    expect(ageAt(-5)).toBe(0);
    expect(ageAt(30)).toBe(0);
    expect(ageAt(59)).toBe(0);
    expect(ageAt(60)).toBe(1);
  });
  it('advances freshness/countdowns while preserving the original reset instant', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record: SnapshotWithWindows = {
      ...makeSnapshot('c1', { id: 's1', fetchedAt: NOW.toISOString() }),
      windows: [
        makeWindow('s1', {
          resetsAt: '2026-09-28T00:02:20Z',
          utilization: 0.8,
        }),
      ],
    };
    const viewAt = (minutes: number) =>
      buildProviderViews({
        descriptors,
        connections: [connection],
        latest: new Map([['c1', record]]),
        now: new Date(NOW.getTime() + minutes * 60_000),
      }).find((item) => item.id === 'claude')!;
    expect(viewAt(0).windows[0].resetsInMinutes).toBe(2);
    expect(viewAt(1).windows[0].resetsInMinutes).toBe(1);
    expect(viewAt(3).windows[0].resetDue).toBe(true);
    expect(viewAt(3).windows[0].resetsAt).toBe('2026-09-28T00:02:20.000Z');
    expect(viewAt(3).windows[0].percent).toBe(80);
    expect(viewAt(3).updatedMinutesAgo).toBe(3);
  });
  it('anchors legacy relative text to its snapshot and never guesses local date labels', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record: SnapshotWithWindows = {
      ...makeSnapshot('c1', { id: 's1', fetchedAt: NOW.toISOString() }),
      windows: [
        makeWindow('s1', { resetsAt: 'in 2 hours' }),
        makeWindow('s1', { resetsAt: 'Oct 1, 2026 12:29 AM' }),
      ],
    };
    const view = buildProviderViews({
      descriptors,
      connections: [connection],
      latest: new Map([['c1', record]]),
      now: new Date(NOW.getTime() + 60_000),
    }).find((item) => item.id === 'claude')!;
    expect(view.windows[0].resetsInMinutes).toBe(119);
    expect(view.windows[0].resetsAt).toBe('2026-09-28T02:00:00.000Z');
    expect(view.windows[1].resetsAt).toBeUndefined();
    expect(view.windows[1].resetsText).toBe('Oct 1, 2026 12:29 AM');
  });
  it('derives every provider from the registry, not static fixtures', () => {
    const views = buildProviderViews({
      descriptors,
      connections: [],
      latest: new Map(),
      now: NOW,
    });
    expect(views.map((view) => view.id).sort()).toEqual(
      descriptors.map((descriptor) => descriptor.id).sort(),
    );
    for (const view of views) {
      expect(view.windows).toEqual([]);
      expect(view.source).toBe('none');
    }
    expect(views.find((view) => view.id === 'claude')?.state).toBe('blocked');
    expect(views.find((view) => view.id === 'github-copilot')?.state).toBe(
      'candidate-disabled',
    );
  });

  it('shows windows only when a snapshot is persisted', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record: SnapshotWithWindows = {
      ...makeSnapshot('c1', {
        id: 's1',
        fetchedAt: '2026-09-27T23:55:00.000Z',
      }),
      windows: [
        makeWindow('s1', {
          externalKey: 'w1',
          label: '5-hour window',
          usedDecimal: '42',
          limitDecimal: '100',
          utilization: 0.42,
          unit: 'percent',
        }),
      ],
    };

    const view = buildProviderViews({
      descriptors,
      connections: [connection],
      latest: new Map([['c1', record]]),
      now: NOW,
    }).find((item) => item.id === 'claude');

    expect(view?.state).toBe('connected');
    expect(view?.source).toBe('live');
    expect(view?.windows[0].percent).toBe(42);
    expect(view?.windows[0].used).toBe(42);
    expect(view?.updatedMinutesAgo).toBe(5);
  });

  it('maps storage billing windows to the UI billing-period kind', () => {
    const connection = makeConnection({ id: 'c1', providerId: 'claude' });
    const record: SnapshotWithWindows = {
      ...makeSnapshot('c1', { id: 's1' }),
      windows: [makeWindow('s1', { kind: 'billing', label: 'Billing period' })],
    };
    const view = buildProviderViews({
      descriptors,
      connections: [connection],
      latest: new Map([['c1', record]]),
      now: NOW,
    }).find((item) => item.id === 'claude');
    expect(view?.windows[0].kind).toBe('billing-period');
  });
});

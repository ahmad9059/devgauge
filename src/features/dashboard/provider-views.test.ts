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

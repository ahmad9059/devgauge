import { describe, expect, it } from 'vitest';

import { foregroundTrigger, isStale } from '@/features/dashboard/lifecycle';

describe('app lifecycle', () => {
  it('triggers a foreground refresh only when becoming active', () => {
    expect(foregroundTrigger('background', 'active')).toBe('foreground');
    expect(foregroundTrigger('inactive', 'active')).toBe('foreground');
    expect(foregroundTrigger('active', 'active')).toBeNull();
    expect(foregroundTrigger('active', 'background')).toBeNull();
  });

  it('detects stale cache against a TTL', () => {
    const now = new Date('2026-09-28T00:10:00.000Z');
    expect(isStale(null, now, 300)).toBe(true);
    expect(isStale('2026-09-28T00:08:00.000Z', now, 300)).toBe(false);
    expect(isStale('2026-09-28T00:00:00.000Z', now, 300)).toBe(true);
  });
});

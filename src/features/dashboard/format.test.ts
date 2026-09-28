import { describe, expect, it } from 'vitest';

import {
  formatDecimalValue,
  formatLimit,
  formatPercent,
  freshnessLabel,
} from '@/features/dashboard/format';

describe('dashboard formatting', () => {
  it('never renders an unknown value as zero', () => {
    expect(formatDecimalValue(null, 'percent')).toBe('—');
    expect(formatPercent(null)).toBe('—');
    expect(formatLimit(null, 'requests')).toBe('unknown limit');
    expect(formatLimit(null, 'currency')).toBe('no cap');
  });

  it('keeps decimal precision and unit labels', () => {
    expect(formatDecimalValue('9007199254740993', 'tokens')).toBe(
      '9007199254740993 tokens',
    );
    expect(formatDecimalValue('18.5', 'currency')).toBe('$18.5');
    expect(formatDecimalValue('42', 'percent')).toBe('42%');
    expect(formatPercent(0.423)).toBe('42.3%');
  });

  it('labels data age and never-synced state', () => {
    const now = new Date('2026-09-28T00:10:00.000Z');
    expect(freshnessLabel(null, now)).toBe('Never synced');
    expect(freshnessLabel('2026-09-28T00:00:00.000Z', now)).toBe(
      'Updated 10m ago',
    );
    expect(freshnessLabel('not-a-date', now)).toBe('Never synced');
  });
});

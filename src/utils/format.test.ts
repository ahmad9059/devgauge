import { describe, expect, it } from 'vitest';

import {
  clampPercent,
  formatClockTime,
  formatDateTime,
  formatProviderResetText,
  formatUsageReset,
  formatCount,
  formatCountdown,
  formatRelativeMinutes,
  trim,
} from './format';

describe('usage formatting', () => {
  it('uses countdowns for rolling/weekly limits and a short date for monthly limits', () => {
    const now = new Date(2026, 9, 1, 10);
    expect(
      formatUsageReset(
        {
          kind: 'rolling',
          resetsAt: new Date(2026, 9, 1, 14, 57).toISOString(),
        },
        now,
      ),
    ).toBe('Resets in 4h 57m');
    expect(
      formatUsageReset(
        { kind: 'weekly', resetsAt: new Date(2026, 9, 8, 8).toISOString() },
        now,
      ),
    ).toBe('Resets in 6d 22h');
    expect(
      formatUsageReset(
        { kind: 'monthly', resetsAt: new Date(2026, 9, 15, 10).toISOString() },
        now,
      ),
    ).toBe('Resets on Oct 15');
    expect(
      formatUsageReset({ kind: 'monthly', resetsText: 'on Oct 15' }, now),
    ).toBe('Resets on Oct 15');
    expect(formatUsageReset({ kind: 'rolling' }, now)).toBeUndefined();
  });
  it('displays offset-free provider dates as local countdowns without changing their scheduling status', () => {
    const now = new Date(2026, 9, 1, 10);
    expect(
      formatUsageReset(
        { kind: 'rolling', resetsText: 'Oct 1, 2026 2:57 PM' },
        now,
      ),
    ).toBe('Resets in 4h 57m');
    expect(
      formatUsageReset(
        { kind: 'weekly', resetsText: 'Oct 8, 2026 8:00 AM' },
        now,
      ),
    ).toBe('Resets in 6d 22h');
    expect(
      formatUsageReset(
        { kind: 'monthly', resetsText: 'Nov 1, 2026 5:00 AM' },
        now,
      ),
    ).toBe('Resets on Nov 1');
    expect(
      formatUsageReset({ kind: 'weekly', resetsText: 'bad date' }, now),
    ).toBe('Resets bad date');
  });
  it('formats wall times in the device timezone with the requested readable date and clock', () => {
    // A local constructor deliberately follows the test device's timezone.
    const local = new Date(2026, 9, 2, 3, 23);
    expect(formatDateTime(local.toISOString())).toBe('Oct 2, 2026 3:23AM');
    expect(formatDateTime('bad date')).toBeNull();
    expect(formatProviderResetText('Oct 2, 2026 3:23 AM')).toBe(
      'Oct 2, 2026 3:23AM',
    );
    expect(formatProviderResetText('on Oct 15')).toBe('on Oct 15');
  });
  it('formats counts by unit', () => {
    expect(formatCount(42, 'percent')).toBe('42%');
    expect(formatCount(0.01, 'percent')).toBe('0.01%');
    expect(formatCount(18.5, 'currency')).toBe('$18.5');
    expect(formatCount(640, 'requests')).toBe('640 requests');
    expect(formatCount(12, 'credits')).toBe('12 credits');
    expect(formatCount(1500, 'tokens')).toBe('1500 tokens');
  });

  it('handles missing values without inventing numbers', () => {
    expect(trim(Number.NaN)).toBe('—');
    expect(formatCountdown(undefined)).toBeNull();
    expect(formatRelativeMinutes(undefined)).toBeNull();
    expect(formatClockTime(new Date(), undefined)).toBeNull();
    expect(clampPercent(undefined)).toBe(0);
  });

  it('formats countdowns compactly', () => {
    expect(formatCountdown(0.2)).toBe('under a minute');
    expect(formatCountdown(42)).toBe('42m');
    expect(formatCountdown(125)).toBe('2h 05m');
    expect(formatCountdown(120)).toBe('2h');
    expect(formatCountdown(4320)).toBe('3d');
    expect(formatCountdown(4380)).toBe('3d 1h');
  });

  it('formats freshness relative to now', () => {
    expect(formatRelativeMinutes(0.5)).toBe('just now');
    expect(formatRelativeMinutes(12)).toBe('12m ago');
    expect(formatRelativeMinutes(2880)).toBe('2d ago');
  });

  it('formats a reset clock time from a reference instant', () => {
    const reference = new Date('2026-09-25T10:00:00');
    expect(formatClockTime(reference, 0)).toBe('10:00 AM');
    expect(formatClockTime(reference, 125)).toBe('12:05 PM');
    expect(formatClockTime(reference, 720)).toBe('10:00 PM');
    expect(formatClockTime(reference, 840)).toBe('12:00 AM');
  });

  it('clamps progress into 0-100', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(42.5)).toBe(42.5);
  });
});

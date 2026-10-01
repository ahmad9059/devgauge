import { describe, expect, it } from 'vitest';
import { normalizeResetTime } from './reset-time';

describe('reset instants', () => {
  it.each([
    ['2026-10-01T19:20:00.300723+00:00', '2026-10-01T19:20:00.300Z'],
    ['2026-10-05T20:00:00.300749+00:00', '2026-10-05T20:00:00.300Z'],
    ['2026-10-01T19:20:00.300723999+05:00', '2026-10-01T14:20:00.300Z'],
  ])(
    'normalizes provider fractional-second precision in %s',
    (input, expected) => {
      expect(normalizeResetTime(input)).toBe(expected);
    },
  );
  it('normalizes UTC, offset, and epoch values without a device timezone', () => {
    expect(normalizeResetTime('2026-10-01T05:30:00+05:30')).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    expect(normalizeResetTime('2026-10-01T00:00Z')).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    expect(normalizeResetTime(1790812800)).toBe('2026-10-01T00:00:00.000Z');
    expect(normalizeResetTime(1790812800000)).toBe('2026-10-01T00:00:00.000Z');
  });
  it('anchors elapsed durations across month and DST boundaries', () => {
    expect(
      normalizeResetTime('in 4h 41m', new Date('2026-09-30T23:00:00Z')),
    ).toBe('2026-10-01T03:41:00.000Z');
    expect(
      normalizeResetTime('in 2 hours', new Date('2026-03-08T01:30:00-05:00')),
    ).toBe('2026-03-08T08:30:00.000Z');
    expect(normalizeResetTime('in 1d', new Date('2026-12-31T00:00Z'))).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
  it.each([
    'Oct 1, 2026 12:29 AM',
    'on Oct 15',
    '2026-10-01T12:00',
    '2026-02-30T00:00Z',
    '2026-10-01T24:00Z',
    '2026-10-01T00:00+15:00',
    '2026-10-01T19:20:00.3007239999+00:00',
    'in 2 hours tomorrow',
    '',
    'in forever',
  ])('keeps ambiguous or invalid %s unschedulable', (value) => {
    expect(normalizeResetTime(value, new Date('2026-10-01T00:00Z'))).toBeNull();
  });
  it('requires a capture instant for relative labels', () => {
    expect(normalizeResetTime('in 2 hours')).toBeNull();
  });
});

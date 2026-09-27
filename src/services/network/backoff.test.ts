import { describe, expect, it } from 'vitest';

import {
  computeBackoff,
  isRetryableStatus,
  parseRetryAfter,
} from '@/services/network/backoff';

describe('backoff', () => {
  it('grows exponentially and is capped', () => {
    const neutral = () => 0.5;
    expect(computeBackoff(1, { baseMs: 1000, random: neutral })).toBe(1000);
    expect(computeBackoff(2, { baseMs: 1000, random: neutral })).toBe(2000);
    expect(computeBackoff(3, { baseMs: 1000, random: neutral })).toBe(4000);
    expect(
      computeBackoff(20, { baseMs: 1000, maxMs: 60_000, random: neutral }),
    ).toBe(60_000);
  });

  it('applies symmetric jitter deterministically', () => {
    expect(
      computeBackoff(2, { baseMs: 1000, jitter: 0.5, random: () => 0 }),
    ).toBe(1000);
    expect(
      computeBackoff(2, { baseMs: 1000, jitter: 0.5, random: () => 1 }),
    ).toBe(3000);
  });

  it('rejects an invalid attempt number', () => {
    expect(() => computeBackoff(0)).toThrow(/attempt/);
  });

  it('parses Retry-After seconds and HTTP dates', () => {
    const now = new Date('2026-09-28T00:00:00.000Z');
    expect(parseRetryAfter('120', now)?.toISOString()).toBe(
      '2026-09-28T00:02:00.000Z',
    );
    expect(
      parseRetryAfter('Wed, 28 Oct 2026 00:05:00 GMT', now)?.toISOString(),
    ).toBe('2026-10-28T00:05:00.000Z');
    expect(parseRetryAfter('0', now)?.getTime()).toBe(now.getTime());
    // An already-elapsed HTTP-date means no wait.
    expect(parseRetryAfter('Tue, 27 Sep 2026 00:00:00 GMT', now)).toBeNull();
    expect(parseRetryAfter('nonsense', now)).toBeNull();
    expect(parseRetryAfter(undefined, now)).toBeNull();
  });

  it('classifies retryable HTTP statuses', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
  });
});

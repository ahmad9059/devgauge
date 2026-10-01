import { describe, expect, it } from 'vitest';
import {
  parseCodexEarnedResets,
  parseCodexResetOutcome,
} from './provider-reset';
const now = new Date('2026-10-01T00:00:00Z');
describe('documented earned reset contract', () => {
  it('distinguishes unknown, count-only, and known empty details', () => {
    expect(parseCodexEarnedResets(null, now)).toMatchObject({
      state: 'unknown',
      availableCount: null,
    });
    expect(
      parseCodexEarnedResets({ availableCount: 2, credits: null }, now),
    ).toMatchObject({ state: 'available', offers: null });
    expect(
      parseCodexEarnedResets({ availableCount: 0, credits: [] }, now),
    ).toEqual({ state: 'none', availableCount: 0, offers: [] });
  });
  it('preserves authoritative count, opaque IDs and nullable expiry', () => {
    const parsed = parseCodexEarnedResets(
      {
        availableCount: 3,
        credits: [
          {
            id: 'opaque/credit',
            status: 'available',
            resetType: 'codexRateLimits',
            expiresAt: null,
          },
        ],
      },
      now,
    );
    expect(parsed.availableCount).toBe(3);
    expect(parsed.offers).toMatchObject([
      { id: 'opaque/credit', expiresAt: null },
    ]);
    expect(
      parseCodexEarnedResets({ availableCount: 1, credits: [] }, now).state,
    ).toBe('available');
  });
  it('rejects malformed credit details instead of inventing eligibility', () => {
    expect(parseCodexEarnedResets({ availableCount: -1 }, now).state).toBe(
      'unknown',
    );
    expect(
      parseCodexEarnedResets(
        { availableCount: 2, credits: [{ id: '', expiresAt: 'tomorrow' }] },
        now,
      ).state,
    ).toBe('unknown');
  });
  it('recognizes expiry without overriding a positive authoritative count', () => {
    const credit = {
      id: 'old',
      status: 'expired',
      resetType: 'codexRateLimits',
      expiresAt: 1750000000,
    };
    expect(
      parseCodexEarnedResets({ availableCount: 0, credits: [credit] }, now)
        .state,
    ).toBe('expired');
    expect(
      parseCodexEarnedResets({ availableCount: 1, credits: [credit] }, now)
        .state,
    ).toBe('available');
  });
  it.each(['reset', 'alreadyRedeemed', 'nothingToReset', 'noCredit'])(
    'accepts %s outcome but requires fresh limits separately',
    (outcome) => {
      expect(parseCodexResetOutcome({ outcome })).toBe(outcome);
    },
  );
  it('rejects unknown outcome and never converts navigation into success', () => {
    expect(parseCodexResetOutcome({ outcome: 'opened' })).toBeNull();
  });
});

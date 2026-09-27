import { describe, expect, it } from 'vitest';

import { deriveWindow } from '@/domain/usage';

describe('usage window derivation', () => {
  it('derives remaining and utilization when limit and used are known', () => {
    const window = deriveWindow({
      externalKey: 'five-hour',
      kind: 'rolling',
      label: '5-hour window',
      used: '42',
      limit: '100',
      unit: 'percent',
      derivation: 'provider',
    });
    expect(window.remaining).toBe('58');
    expect(window.utilization).toBeCloseTo(0.42);
    expect(window.used).toBe('42');
    expect(window.limit).toBe('100');
  });

  it('keeps unknown values null instead of inventing zero', () => {
    const window = deriveWindow({
      externalKey: 'monthly',
      kind: 'monthly',
      label: 'Monthly',
      unit: 'requests',
      derivation: 'provider',
    });
    expect(window.used).toBeNull();
    expect(window.limit).toBeNull();
    expect(window.remaining).toBeNull();
    expect(window.utilization).toBeNull();
  });

  it('keeps utilization above 1 and never derives negative remaining', () => {
    const window = deriveWindow({
      externalKey: 'over',
      kind: 'weekly',
      label: 'Weekly',
      used: '120',
      limit: '100',
      unit: 'percent',
      derivation: 'provider',
    });
    expect(window.utilization).toBeCloseTo(1.2);
    expect(window.remaining).toBeNull();
  });

  it('does not divide by a zero limit', () => {
    const window = deriveWindow({
      externalKey: 'zero',
      kind: 'daily',
      label: 'Daily',
      used: '0',
      limit: '0',
      unit: 'credits',
      derivation: 'provider',
    });
    expect(window.utilization).toBeNull();
  });

  it('preserves an explicit remaining and currency code', () => {
    const window = deriveWindow({
      externalKey: 'billing',
      kind: 'billing',
      label: 'Billing period',
      used: '18.5',
      limit: '40',
      remaining: '21.5',
      unit: 'currency',
      currencyCode: 'USD',
      derivation: 'provider',
    });
    expect(window.remaining).toBe('21.5');
    expect(window.currencyCode).toBe('USD');
  });
});

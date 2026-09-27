import { describe, expect, it } from 'vitest';

import {
  addDecimal,
  canonicalizeDecimal,
  compareDecimal,
  decimalToNumber,
  isDecimalString,
  isZeroDecimal,
  subtractDecimal,
} from '@/domain/decimal';

describe('decimal arithmetic', () => {
  it('round-trips large integers and currency without precision loss', () => {
    expect(canonicalizeDecimal('9007199254740993')).toBe('9007199254740993');
    expect(canonicalizeDecimal('18.50')).toBe('18.5');
    expect(canonicalizeDecimal('0.10')).toBe('0.1');
    expect(addDecimal('0.1', '0.2')).toBe('0.3');
    expect(addDecimal('9007199254740993', '1')).toBe('9007199254740994');
  });

  it('subtracts without float error', () => {
    expect(subtractDecimal('40', '21.5')).toBe('18.5');
    expect(subtractDecimal('100', '100')).toBe('0');
    expect(() => subtractDecimal('1', '2')).toThrow(/negative/);
  });

  it('compares decimals of different scale', () => {
    expect(compareDecimal('1.50', '1.5')).toBe(0);
    expect(compareDecimal('2', '10')).toBe(-1);
    expect(compareDecimal('10', '2')).toBe(1);
  });

  it('validates and classifies decimal strings', () => {
    expect(isDecimalString('0')).toBe(true);
    expect(isDecimalString('12.5')).toBe(true);
    expect(isDecimalString('-1')).toBe(false);
    expect(isDecimalString('1e3')).toBe(false);
    expect(isZeroDecimal('0.0')).toBe(true);
    expect(decimalToNumber('1.5')).toBeCloseTo(1.5);
  });
});

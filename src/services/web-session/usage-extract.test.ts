import { describe, expect, it } from 'vitest';

import {
  extractUsageWindows,
  mergeRawWindows,
  type WindowKeyMap,
} from './usage-extract';

const keys: WindowKeyMap = { primary: { label: 'Session', kind: 'rolling' } };
function extract(payload: unknown, keyMap = keys) {
  return extractUsageWindows(
    [
      {
        url: 'https://example.test/usage',
        body: JSON.stringify({ primary: payload }),
      },
    ],
    keyMap,
  ).windows;
}

describe('field-specific usage units', () => {
  it('normalizes tiny finite percentages without throwing on scientific notation', () => {
    expect(extract({ used_percent: 0.0000001 })[0].used).toBe('0.0000001');
  });
  it('does not let nested usage history override the current direct quota', () => {
    expect(
      extract({ used_percent: 40, history: [{ used_percent: 99 }] }).map(
        (window) => window.used,
      ),
    ).toEqual(['40']);
  });
  it('preserves a fresh lower quota after a reset', () => {
    expect(
      mergeRawWindows([
        { key: 'primary', usedPercent: 90, resetsAt: 'in 1 hour' },
        { key: 'primary', usedPercent: 0, resetsAt: null },
      ]),
    ).toEqual([{ key: 'primary', usedPercent: 0, resetsAt: null }]);
  });
  it('enriches duplicate quota values with reset timing without mutating capture inputs', () => {
    const first = { key: 'five_hour', usedPercent: 24, resetsAt: null };
    const reset = '2026-10-01T09:00:00Z';
    expect(
      mergeRawWindows([first, { ...first, resetsAt: reset }])[0].resetsAt,
    ).toBe(reset);
    expect(first.resetsAt).toBeNull();
    expect(
      mergeRawWindows([first, { ...first, usedPercent: 0, resetsAt: reset }])[0]
        .resetsAt,
    ).toBe(reset);
    expect(
      mergeRawWindows([first, { ...first, usedPercent: 0, resetsAt: null }])[0],
    ).toMatchObject({ usedPercent: 0, resetsAt: null });
  });
  it.each([0, 0.5, 1, 1.5, 100])('preserves explicit %s percent', (value) => {
    expect(extract({ used_percent: value })[0].utilization).toBe(value / 100);
    expect(extract({ utilization: value })[0].utilization).toBe(value / 100);
    expect(extract({ remaining_percent: value })[0].utilization).toBe(
      (100 - value) / 100,
    );
  });
  it('converts only declared ratio fields', () => {
    expect(extract({ used_ratio: 0.5 })[0].used).toBe('50');
    expect(extract({ remaining_ratio: 0.01 })[0].used).toBe('99');
    const ratioKeys: WindowKeyMap = {
      primary: {
        ...keys.primary,
        utilizationUnit: 'ratio',
        remainingUnit: 'ratio',
      },
    };
    expect(extract({ utilization: 1 }, ratioKeys)[0].used).toBe('100');
    expect(extract({ remaining: 0.5 }, ratioKeys)[0].used).toBe('50');
    expect(extract({ remaining: 0.5 })).toEqual([]);
  });
  it.each([
    null,
    {},
    { used_percent: null },
    { used_percent: 'bad' },
    { used_percent: '$1' },
    { used_percent: -1 },
  ])('does not invent usage from malformed data %j', (value) => {
    expect(extract(value)).toEqual([]);
  });
  it('preserves honest over-cap usage and numeric percent strings', () => {
    expect(extract({ used_percent: '1%' })[0].used).toBe('1');
    expect(extract({ used_percent: 120 })[0].utilization).toBe(1.2);
    expect(extract({ remaining_percent: 120 })).toEqual([]);
  });
});

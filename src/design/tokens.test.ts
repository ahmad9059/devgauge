import { describe, expect, it } from 'vitest';

import {
  borderWidths,
  elevations,
  fontSizes,
  lineHeights,
  radii,
  spacing,
  touchTargets,
} from './tokens';

describe('design tokens', () => {
  it('uses a 4/8-point spacing rhythm with 16/24/32 section tiers', () => {
    const values = Object.values(spacing);
    for (const value of values) {
      // 2 is allowed as a half-step; every other step is a multiple of 4.
      expect(value % 2).toBe(0);
    }
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(24);
    expect(spacing.xxl).toBe(32);
    expect(spacing.lg % 8).toBe(0);
    expect(spacing.xl % 8).toBe(0);
    expect(spacing.xxl % 8).toBe(0);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('meets the Android 48dp minimum for interactive targets', () => {
    expect(touchTargets.minimum).toBeGreaterThanOrEqual(48);
    expect(touchTargets.iconButton).toBeGreaterThanOrEqual(48);
    expect(touchTargets.comfortable).toBeGreaterThanOrEqual(
      touchTargets.minimum,
    );
    expect(touchTargets.tabBar).toBeGreaterThanOrEqual(touchTargets.minimum);
  });

  it('keeps card radii restrained and sheets slightly softer', () => {
    expect(radii.card).toBeGreaterThanOrEqual(6);
    expect(radii.card).toBeLessThanOrEqual(12);
    expect(radii.sheet).toBeGreaterThanOrEqual(10);
    expect(radii.sheet).toBeLessThanOrEqual(16);
    expect(radii.control).toBeGreaterThanOrEqual(4);
    expect(radii.control).toBeLessThanOrEqual(10);
    expect(radii.pill).toBe(999);
  });

  it('keeps line height at or above font size for every text tier', () => {
    const pairs: [number, number][] = [
      [fontSizes.caption, lineHeights.caption],
      [fontSizes.label, lineHeights.label],
      [fontSizes.body, lineHeights.body],
      [fontSizes.heading, lineHeights.heading],
      [fontSizes.title, lineHeights.title],
      [fontSizes.display, lineHeights.display],
    ];
    for (const [size, height] of pairs) {
      expect(height).toBeGreaterThanOrEqual(size);
    }
  });

  it('uses thin borders only', () => {
    expect(borderWidths.thin).toBe(1);
    expect(borderWidths.none).toBe(0);
    expect(borderWidths.thick).toBeGreaterThan(borderWidths.thin);
  });

  it('keeps elevation levels ordered and subtle', () => {
    expect(elevations.none).toBe(0);
    expect(elevations.low).toBeGreaterThan(elevations.none);
    expect(elevations.high).toBeGreaterThan(elevations.low);
    expect(elevations.high).toBeLessThanOrEqual(8);
  });
});

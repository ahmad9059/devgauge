import { describe, expect, it } from 'vitest';

import { resolveLayout, wideContentMaxWidth } from './responsive';

describe('responsive layout', () => {
  it('classifies a small phone by its shortest side', () => {
    const layout = resolveLayout(320, 640);
    expect(layout.size).toBe('small');
    expect(layout.isTablet).toBe(false);
    expect(layout.isLandscape).toBe(false);
    expect(layout.contentMaxWidth).toBe(0);
  });

  it('treats the small/phone boundary at the smallPhone breakpoint', () => {
    expect(resolveLayout(359, 800).size).toBe('small');
    expect(resolveLayout(360, 800).size).toBe('phone');
  });

  it('treats the phone/tablet boundary at the tablet breakpoint', () => {
    expect(resolveLayout(719, 2000).size).toBe('phone');
    expect(resolveLayout(720, 2000).size).toBe('tablet');
  });

  it('keeps the device class stable when a phone rotates', () => {
    const portrait = resolveLayout(412, 915);
    const landscape = resolveLayout(915, 412);
    expect(portrait.size).toBe('phone');
    expect(landscape.size).toBe('phone');
    expect(portrait.isLandscape).toBe(false);
    expect(landscape.isLandscape).toBe(true);
    // Only the wide landscape window needs a readable content cap.
    expect(portrait.contentMaxWidth).toBe(0);
    expect(landscape.contentMaxWidth).toBe(wideContentMaxWidth);
  });

  it('caps content only when the window exceeds the readable width', () => {
    expect(resolveLayout(800, 1280).contentMaxWidth).toBe(0);
    expect(resolveLayout(1280, 800).contentMaxWidth).toBe(wideContentMaxWidth);
    expect(resolveLayout(1920, 1080).contentMaxWidth).toBe(wideContentMaxWidth);
  });

  it('flags tablets in both orientations', () => {
    expect(resolveLayout(800, 1280).isTablet).toBe(true);
    expect(resolveLayout(1280, 800).isTablet).toBe(true);
  });
});

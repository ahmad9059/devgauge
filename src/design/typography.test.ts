import { describe, expect, it } from 'vitest';

import { createTheme, customFonts, darkTheme } from './themes';
import { typePresets, typographyFor } from './typography';

describe('typography', () => {
  it('resolves every preset for both themes', () => {
    const names = Object.keys(typePresets);
    for (const theme of [darkTheme, createTheme('light')]) {
      const styles = typographyFor(theme);
      expect(Object.keys(styles)).toEqual(names);
      for (const style of Object.values(styles)) {
        expect(style.fontSize).toBeGreaterThan(0);
        expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize ?? 0);
      }
    }
  });

  it('omits fontFamily when bundled fonts are not loaded', () => {
    const styles = typographyFor(darkTheme);
    expect(styles.body.fontFamily).toBeUndefined();
    expect(styles.monoValue.fontFamily).toBeUndefined();
  });

  it('maps weights to the matching bundled family', () => {
    const styles = typographyFor(createTheme('dark', customFonts));
    expect(styles.body.fontFamily).toBe('Geist_400Regular');
    expect(styles.bodyStrong.fontFamily).toBe('Geist_600SemiBold');
    expect(styles.title.fontFamily).toBe('Geist_600SemiBold');
    expect(styles.monoValue.fontFamily).toBe('GeistMono_500Medium');
    expect(styles.monoCaption.fontFamily).toBe('GeistMono_400Regular');
  });

  it('scales font sizes and line heights without changing weights', () => {
    const base = typographyFor(darkTheme, 1);
    const scaled = typographyFor(darkTheme, 1.5);
    expect(scaled.body.fontSize).toBe(
      Math.round((base.body.fontSize ?? 0) * 1.5),
    );
    expect(scaled.body.fontWeight).toBe(base.body.fontWeight);
  });
});

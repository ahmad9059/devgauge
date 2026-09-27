import { describe, expect, it } from 'vitest';

import {
  contrastRatio as contrast,
  customFonts,
  darkTheme,
  lightTheme,
  resolveTheme,
} from './themes';

const themes = [
  ['light', lightTheme],
  ['dark', darkTheme],
] as const;

describe('theme tokens', () => {
  it('snapshots both themes so token drift is reviewed', () => {
    expect(lightTheme).toMatchSnapshot();
    expect(darkTheme).toMatchSnapshot();
  });

  it('resolves system preference to the matching scheme', () => {
    expect(resolveTheme('system', 'dark').scheme).toBe('dark');
    expect(resolveTheme('system', 'light').scheme).toBe('light');
    expect(resolveTheme('system', null).scheme).toBe('light');
    expect(resolveTheme('light', 'dark').scheme).toBe('light');
    expect(resolveTheme('dark', 'light').scheme).toBe('dark');
  });

  it('applies custom fonts only when a font set is supplied', () => {
    expect(darkTheme.fonts).toEqual({});
    expect(resolveTheme('dark', 'dark', customFonts).fonts.uiRegular).toBe(
      'IBMPlexSans_400Regular',
    );
  });

  it('keeps the defined palette semantic roles complete in both themes', () => {
    const keys = Object.keys(lightTheme.colors);
    expect(Object.keys(darkTheme.colors)).toEqual(keys);
    for (const key of keys) {
      expect(lightTheme.colors[key as keyof typeof lightTheme.colors]).toMatch(
        /^#|^rgba/,
      );
      expect(darkTheme.colors[key as keyof typeof darkTheme.colors]).toMatch(
        /^#|^rgba/,
      );
    }
    expect(Object.keys(lightTheme.tones)).toEqual(Object.keys(darkTheme.tones));
  });
});

describe('accessibility contrast contract', () => {
  const textSurfaces = [
    'background',
    'surface',
    'surfaceElevated',
    'surfaceRaised',
  ] as const;
  const accentRoles = [
    'accent',
    'positive',
    'warning',
    'danger',
    'info',
  ] as const;

  for (const [scheme, theme] of themes) {
    it(`${scheme}: text reaches 4.5:1 on every surface`, () => {
      for (const surface of textSurfaces) {
        for (const role of [
          'textPrimary',
          'textSecondary',
          'textMuted',
        ] as const) {
          expect(
            contrast(theme.colors[role], theme.colors[surface]),
            `${role} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${scheme}: semantic text roles reach 4.5:1 on the background`, () => {
      for (const role of accentRoles) {
        expect(
          contrast(theme.colors[role], theme.colors.background),
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`${scheme}: status tones keep content legible`, () => {
      for (const tone of Object.values(theme.tones)) {
        expect(contrast(tone.content, tone.background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });

    it(`${scheme}: non-text UI reaches 3:1`, () => {
      expect(
        contrast(theme.colors.controlBorder, theme.colors.surface),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(theme.colors.focus, theme.colors.surface),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(theme.colors.progressFill, theme.colors.progressTrack),
      ).toBeGreaterThanOrEqual(3);
    });

    it(`${scheme}: button text contrasts with its fill`, () => {
      expect(
        contrast(theme.colors.accentContrast, theme.colors.accent),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(theme.colors.dangerContrast, theme.colors.dangerFill),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});

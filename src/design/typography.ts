import type { TextStyle } from 'react-native';

import { fontSizes, fontWeights, letterSpacing, lineHeights } from './tokens';
import type { Theme, ThemeFonts } from './themes';

type TypePreset = {
  family: 'ui' | 'mono';
  weight: keyof typeof fontWeights;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

export const typePresets: Record<string, TypePreset> = {
  display: {
    family: 'ui',
    weight: 'bold',
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: letterSpacing.tighter,
  },
  title: {
    family: 'ui',
    weight: 'semibold',
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    letterSpacing: letterSpacing.tight,
  },
  heading: {
    family: 'ui',
    weight: 'semibold',
    fontSize: fontSizes.heading,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacing.tight,
  },
  subheading: {
    family: 'ui',
    weight: 'semibold',
    fontSize: fontSizes.subheading,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    family: 'ui',
    weight: 'regular',
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacing.normal,
  },
  bodyStrong: {
    family: 'ui',
    weight: 'semibold',
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacing.normal,
  },
  label: {
    family: 'ui',
    weight: 'medium',
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: letterSpacing.normal,
  },
  labelStrong: {
    family: 'ui',
    weight: 'semibold',
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    family: 'ui',
    weight: 'medium',
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    letterSpacing: letterSpacing.wide,
  },
  monoValue: {
    family: 'mono',
    weight: 'medium',
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    letterSpacing: letterSpacing.normal,
  },
  monoLabel: {
    family: 'mono',
    weight: 'medium',
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: letterSpacing.normal,
  },
  monoCaption: {
    family: 'mono',
    weight: 'regular',
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    letterSpacing: letterSpacing.normal,
  },
};

export type TypePresetName = keyof typeof typePresets;

const familyFor = (
  fonts: ThemeFonts,
  family: TypePreset['family'],
  weight: TypePreset['weight'],
) => {
  if (family === 'mono') {
    if (weight === 'bold') return fonts.monoBold;
    if (weight === 'regular') return fonts.monoRegular;
    return fonts.monoMedium;
  }
  if (weight === 'bold') return fonts.uiBold;
  if (weight === 'semibold') return fonts.uiSemibold;
  if (weight === 'medium') return fonts.uiMedium;
  return fonts.uiRegular;
};

/**
 * Resolves every text preset for the active theme. When bundled fonts are not
 * loaded, `fontFamily` stays undefined and React Native uses the system font.
 * `scale` applies the optional in-app text-size override on top of system font
 * scaling and is clamped by the caller to accessibility-safe bounds.
 */
export function typographyFor(
  theme: Theme,
  scale = 1,
): Record<TypePresetName, TextStyle> {
  const entries = Object.entries(typePresets) as [TypePresetName, TypePreset][];
  return Object.fromEntries(
    entries.map(([name, preset]) => {
      const style: TextStyle = {
        fontSize: Math.round(preset.fontSize * scale),
        lineHeight: Math.round(preset.lineHeight * scale),
        fontWeight: fontWeights[preset.weight],
        letterSpacing: preset.letterSpacing,
      };
      const fontFamily = familyFor(theme.fonts, preset.family, preset.weight);
      if (fontFamily) style.fontFamily = fontFamily;
      return [name, style];
    }),
  ) as Record<TypePresetName, TextStyle>;
}

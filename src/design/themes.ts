import type { TextStyle } from 'react-native';

import {
  borderWidths,
  elevations,
  fontSizes,
  fontWeights,
  letterSpacing,
  lineHeights,
  radii,
  spacing,
  touchTargets,
} from './tokens';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

/**
 * Every color the UI may render. Names are semantic (role-based), so both
 * themes can be re-tuned without touching components.
 */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  controlBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  positive: string;
  warning: string;
  danger: string;
  info: string;
  dangerFill: string;
  dangerContrast: string;
  focus: string;
  overlay: string;
  skeleton: string;
  progressTrack: string;
  progressFill: string;
  tabBar: string;
  tabBarBorder: string;
};

/** Status tones are shared by chips, progress bars, and connector groupings. */
export type StatusTone =
  'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

export type ToneColors = {
  /** A near-surface backdrop; never a saturated color field. */
  background: string;
  border: string;
  /** Legible text/mark color for the tone. */
  content: string;
};

export type ThemeFonts = {
  uiRegular?: string;
  uiMedium?: string;
  uiSemibold?: string;
  uiBold?: string;
  monoRegular?: string;
  monoMedium?: string;
  monoBold?: string;
};

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  tones: Record<StatusTone, ToneColors>;
  fonts: ThemeFonts;
  spacing: typeof spacing;
  radii: typeof radii;
  borderWidths: typeof borderWidths;
  touchTargets: typeof touchTargets;
  elevations: typeof elevations;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  fontWeights: typeof fontWeights;
  letterSpacing: typeof letterSpacing;
};

/** Bundled Geist webfonts; loaded at runtime with a system-font fallback. */
export const customFonts: ThemeFonts = {
  uiRegular: 'Geist_400Regular',
  uiMedium: 'Geist_500Medium',
  uiSemibold: 'Geist_600SemiBold',
  uiBold: 'Geist_700Bold',
  monoRegular: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoBold: 'GeistMono_700Bold',
};

// Fallback keeps the app usable if font assets fail to load.
export const systemFonts: ThemeFonts = {};

// Monochrome, near-black/white. Color is reserved for state, never decoration.
const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#0A0A0A',
  surfaceElevated: '#111111',
  surfaceRaised: '#1A1A1A',
  surfaceSunken: '#000000',
  border: '#262626',
  borderStrong: '#3F3F46',
  controlBorder: '#66666F',
  textPrimary: '#EDEDED',
  textSecondary: '#A1A1AA',
  textMuted: '#8A8A93',
  textInverse: '#0A0A0A',
  accent: '#EDEDED',
  accentMuted: '#A1A1AA',
  accentContrast: '#0A0A0A',
  positive: '#6FD79B',
  warning: '#E8C766',
  danger: '#F19193',
  info: '#7FB4F5',
  dangerFill: '#B3261E',
  dangerContrast: '#FFFFFF',
  focus: '#7FB4F5',
  overlay: 'rgba(0, 0, 0, 0.7)',
  skeleton: '#1A1A1A',
  progressTrack: '#262626',
  progressFill: '#EDEDED',
  tabBar: '#050505',
  tabBarBorder: '#1F1F1F',
};

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',
  surfaceRaised: '#F4F4F5',
  surfaceSunken: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  controlBorder: '#8A8A93',
  textPrimary: '#09090B',
  textSecondary: '#52525B',
  textMuted: '#67676F',
  textInverse: '#FFFFFF',
  accent: '#09090B',
  accentMuted: '#52525B',
  accentContrast: '#FFFFFF',
  positive: '#15803D',
  warning: '#8A5A12',
  danger: '#B91C1C',
  info: '#1D4ED8',
  dangerFill: '#B91C1C',
  dangerContrast: '#FFFFFF',
  focus: '#1D4ED8',
  overlay: 'rgba(9, 9, 11, 0.4)',
  skeleton: '#E4E4E7',
  progressTrack: '#E4E4E7',
  progressFill: '#09090B',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
};

const darkTones: Record<StatusTone, ToneColors> = {
  neutral: { background: '#141414', border: '#262626', content: '#A1A1AA' },
  accent: { background: '#141414', border: '#262626', content: '#EDEDED' },
  info: { background: '#0E1622', border: '#1E3A5F', content: '#7FB4F5' },
  success: { background: '#0E1A13', border: '#1F4030', content: '#6FD79B' },
  warning: { background: '#1E1808', border: '#4A3B12', content: '#E8C766' },
  danger: { background: '#1E0F10', border: '#5A2225', content: '#F19193' },
};

const lightTones: Record<StatusTone, ToneColors> = {
  neutral: { background: '#FAFAFA', border: '#E4E4E7', content: '#52525B' },
  accent: { background: '#FAFAFA', border: '#E4E4E7', content: '#09090B' },
  info: { background: '#F2F7FE', border: '#CFE0F7', content: '#1D4ED8' },
  success: { background: '#F1F8F4', border: '#C8E6D4', content: '#15803D' },
  warning: { background: '#FBF6E9', border: '#EADFB8', content: '#8A5A12' },
  danger: { background: '#FCF2F2', border: '#F2CFCE', content: '#B91C1C' },
};

const scales = {
  spacing,
  radii,
  borderWidths,
  touchTargets,
  elevations,
  fontSizes,
  lineHeights,
  fontWeights,
  letterSpacing,
} as const;

export function createTheme(
  scheme: ColorScheme,
  fonts: ThemeFonts = systemFonts,
): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    tones: scheme === 'dark' ? darkTones : lightTones,
    fonts,
    ...scales,
  };
}

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export function resolveTheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
  fonts: ThemeFonts = systemFonts,
): Theme {
  const scheme: ColorScheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;
  return createTheme(scheme, fonts);
}

/** WCAG relative luminance for a 3/6-digit hex color. */
export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two opaque hex colors. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export type { TextStyle };

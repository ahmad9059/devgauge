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
  background: string;
  border: string;
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

/** Bundled webfonts; loaded at runtime with a system-font fallback. */
export const customFonts: ThemeFonts = {
  uiRegular: 'IBMPlexSans_400Regular',
  uiMedium: 'IBMPlexSans_500Medium',
  uiSemibold: 'IBMPlexSans_600SemiBold',
  uiBold: 'IBMPlexSans_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

// Fallback keeps the app usable if font assets fail to load.
export const systemFonts: ThemeFonts = {};

const darkColors: ThemeColors = {
  background: '#101215',
  surface: '#181B1F',
  surfaceElevated: '#1F2329',
  surfaceRaised: '#262B32',
  surfaceSunken: '#0B0D0F',
  border: '#313841',
  borderStrong: '#454E59',
  controlBorder: '#6B7480',
  textPrimary: '#F3F4F6',
  textSecondary: '#C2C8D0',
  textMuted: '#9AA1AA',
  textInverse: '#16181C',
  accent: '#E8B65F',
  accentMuted: '#B98E42',
  accentContrast: '#16181C',
  positive: '#7BD39B',
  warning: '#F1C55A',
  danger: '#F58B90',
  info: '#8CC0F5',
  dangerFill: '#B3261E',
  dangerContrast: '#FFFFFF',
  focus: '#8CC0F5',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#2A3038',
  progressTrack: '#2C333B',
  progressFill: '#E8B65F',
  tabBar: '#14171B',
  tabBarBorder: '#262B32',
};

const lightColors: ThemeColors = {
  background: '#F6F2EA',
  surface: '#FFFFFF',
  surfaceElevated: '#FCF9F3',
  surfaceRaised: '#F1EBE0',
  surfaceSunken: '#EDE6D9',
  border: '#E0D7C7',
  borderStrong: '#C7BCA8',
  controlBorder: '#767D88',
  textPrimary: '#1B1E22',
  textSecondary: '#4A5058',
  textMuted: '#5D646C',
  textInverse: '#FFFFFF',
  accent: '#8A5A12',
  accentMuted: '#A97A2E',
  accentContrast: '#FFFFFF',
  positive: '#1B7A48',
  warning: '#8A5A12',
  danger: '#B3261E',
  info: '#1B5FA8',
  dangerFill: '#B3261E',
  dangerContrast: '#FFFFFF',
  focus: '#1B5FA8',
  overlay: 'rgba(27, 30, 34, 0.45)',
  skeleton: '#E5DDCE',
  progressTrack: '#E2D9C9',
  progressFill: '#8A5A12',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7DFD1',
};

const darkTones: Record<StatusTone, ToneColors> = {
  neutral: { background: '#242A31', border: '#3A424C', content: '#C2C8D0' },
  accent: { background: '#2C2417', border: '#5C4A22', content: '#EEC078' },
  info: { background: '#18293B', border: '#2C4863', content: '#9CC8F7' },
  success: { background: '#152A20', border: '#265039', content: '#8ADBAA' },
  warning: { background: '#2E2616', border: '#5C4A22', content: '#F1C55A' },
  danger: { background: '#2E1B1D', border: '#5C2F32', content: '#F7A0A4' },
};

const lightTones: Record<StatusTone, ToneColors> = {
  neutral: { background: '#EFE9DD', border: '#D8CDB9', content: '#3F454D' },
  accent: { background: '#F6EBD4', border: '#E1C99A', content: '#7A4E0A' },
  info: { background: '#E4EEFA', border: '#B7D2EF', content: '#14508F' },
  success: { background: '#E1F1E7', border: '#B4DCC4', content: '#146039' },
  warning: { background: '#F7EDD5', border: '#E3CD97', content: '#7A4E0A' },
  danger: { background: '#FBE5E4', border: '#EFBDBB', content: '#96201A' },
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

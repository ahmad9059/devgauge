import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

import {
  resolveTheme,
  systemFonts,
  customFonts,
  type Theme,
  type ThemePreference,
} from './themes';
import { typographyFor } from './typography';

export const TEXT_SCALE_PRESETS = [1, 1.15, 1.3, 1.5] as const;
export type TextScale = (typeof TEXT_SCALE_PRESETS)[number];

export type ThemeContextValue = {
  theme: Theme;
  typography: ReturnType<typeof typographyFor>;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
  reduceMotion: boolean;
  fontsLoaded: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = 'system',
  initialTextScale = 1,
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
  initialTextScale?: TextScale;
}) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] =
    useState<ThemePreference>(initialPreference);
  const [textScale, setTextScale] = useState<TextScale>(initialTextScale);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const theme = useMemo(
    () =>
      resolveTheme(
        preference,
        systemScheme,
        fontsLoaded ? customFonts : systemFonts,
      ),
    [preference, systemScheme, fontsLoaded],
  );

  const typography = useMemo(
    () => typographyFor(theme, textScale),
    [theme, textScale],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      typography,
      preference,
      setPreference,
      textScale,
      setTextScale,
      reduceMotion,
      fontsLoaded,
    }),
    [theme, typography, preference, textScale, reduceMotion, fontsLoaded],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

const fallbackTheme = resolveTheme('light', 'light');

/**
 * Safe theme access. Falls back to the light theme so a component rendered
 * outside the provider (for example in a test) never crashes.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context) return context;
  return {
    theme: fallbackTheme,
    typography: typographyFor(fallbackTheme),
    preference: 'system',
    setPreference: () => undefined,
    textScale: 1,
    setTextScale: () => undefined,
    reduceMotion: false,
    fontsLoaded: false,
  };
}

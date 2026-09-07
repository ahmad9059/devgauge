import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";

import { getTheme, type AppearanceMode, type ThemeTokens } from "./tokens";

export interface AppTextScale {
  /** Multiplier applied on top of system font scaling (never reduces below the OS floor). */
  value: number;
}

interface ThemeContextValue {
  /** Current resolved theme. */
  theme: ThemeTokens;
  /** User selection (system/dark/light). */
  appearance: AppearanceMode;
  setAppearance: (mode: AppearanceMode) => void;
  /** In-app text size multiplier. */
  textScale: number;
  setTextScale: (scale: number) => void;
  reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const APP_TEXT_SCALES: readonly { label: string; value: number }[] = [
  { label: "Smaller", value: 0.9 },
  { label: "Default", value: 1 },
  { label: "Larger", value: 1.15 },
];

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearanceMode>("system");
  const [textScale, setTextScaleState] = useState<number>(1);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  const resolvedMode: "dark" | "light" =
    appearance === "system" ? (systemScheme === "light" ? "light" : "dark") : appearance;

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  const setAppearance = useCallback((mode: AppearanceMode) => setAppearanceState(mode), []);
  const setTextScale = useCallback((scale: number) => setTextScaleState(scale), []);

  // Reflect OS reduce-motion preference; screen transitions stay instant/crossfade.
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, appearance, setAppearance, textScale, setTextScale, reduceMotion }),
    [theme, appearance, setAppearance, textScale, setTextScale, reduceMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
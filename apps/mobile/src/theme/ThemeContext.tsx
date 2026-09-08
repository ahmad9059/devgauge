import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";

import { getTheme, type AppearanceMode, type ThemeTokens } from "./tokens";
import { readPreferences, writePreferences } from "../storage/preferences";

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
  const [hydrated, setHydrated] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  // Restore persisted appearance choices before first paint.
  useEffect(() => {
    let cancelled = false;
    void readPreferences().then((prefs) => {
      if (cancelled) return;
      setAppearanceState(prefs.appearance);
      setTextScaleState(prefs.textScale);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reflect OS reduce-motion and subscribe to changes.
  useEffect(() => {
    let mounted = true;
    const update = (enabled: boolean): void => {
      if (mounted) setReduceMotion(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const resolvedMode: "dark" | "light" =
    appearance === "system" ? (systemScheme === "light" ? "light" : "dark") : appearance;

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode]);

  const setAppearance = useCallback((mode: AppearanceMode) => setAppearanceState(mode), []);
  const setTextScale = useCallback((scale: number) => setTextScaleState(scale), []);

  // Persist appearance + text scale together once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    void writePreferences({ appearance, textScale });
  }, [appearance, textScale, hydrated]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, appearance, setAppearance, textScale, setTextScale, reduceMotion }),
    [theme, appearance, setAppearance, textScale, setTextScale, reduceMotion]
  );

  return <ThemeContext.Provider value={value}>{hydrated ? children : children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

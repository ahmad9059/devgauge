export type ThemeMode = "dark" | "light";
export type AppearanceMode = "system" | "dark" | "light";

export interface ThemeColors {
  /** App canvas. */
  bg: string;
  /** Default surface for content blocks. */
  surface: string;
  /** Raised surface: cards, stages. */
  surfaceRaised: string;
  /** Sunken inset surface. */
  surfaceSunken: string;
  /** Overlay/scrim behind sheets. */
  overlay: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** Primary/active accent (white-on-black signature). */
  accent: string;
  onAccent: string;
  focus: string;
  available: string;
  warning: string;
  danger: string;
  /** Per-provider identity marks. */
  provider: Record<string, string>;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
}

export interface ThemeType {
  display: number;
  titleLarge: number;
  title: number;
  body: number;
  label: number;
  caption: number;
}

export interface ThemeTokens {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  type: ThemeType;
}

const spacing: ThemeSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
const radius: ThemeRadius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
const type: ThemeType = {
  display: 44,
  titleLarge: 24,
  title: 17,
  body: 15,
  label: 13,
  caption: 12,
};

const dark: ThemeColors = {
  bg: "#000000",
  surface: "#0B0B0D",
  surfaceRaised: "#151518",
  surfaceSunken: "#080809",
  overlay: "rgba(0,0,0,0.72)",
  border: "#1F1F23",
  borderStrong: "#2E2E34",
  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  accent: "#FFFFFF",
  onAccent: "#000000",
  focus: "#3B82F6",
  available: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  provider: {
    "claude-code": "#D97757",
    codex: "#10A37F",
    "opencode-go": "#A855F7",
    "github-copilot": "#8957E5",
  },
};

const light: ThemeColors = {
  bg: "#FFFFFF",
  surface: "#F4F4F5",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#ECECEE",
  overlay: "rgba(24,24,27,0.5)",
  border: "#E4E4E7",
  borderStrong: "#D4D4D8",
  text: "#18181B",
  textSecondary: "#52525B",
  textMuted: "#71717A",
  accent: "#000000",
  onAccent: "#FFFFFF",
  focus: "#2563EB",
  available: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  provider: {
    "claude-code": "#C2410C",
    codex: "#0D9488",
    "opencode-go": "#9333EA",
    "github-copilot": "#6D28D9",
  },
};

export const getTheme = (mode: ThemeMode): ThemeTokens => ({
  mode,
  colors: mode === "dark" ? dark : light,
  spacing,
  radius,
  type,
});

export const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "OpenAI Codex",
  "opencode-go": "OpenCode Go",
  "github-copilot": "GitHub Copilot",
};
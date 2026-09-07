import { Text, type TextProps } from "react-native";

import { useTheme } from "../theme";

export type TextVariant = "display" | "titleLarge" | "title" | "body" | "label" | "caption";
export type TextTone =
  | "default"
  | "secondary"
  | "muted"
  | "accent"
  | "available"
  | "warning"
  | "danger"
  | "provider";

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  tabular?: boolean;
  color?: string;
  children: React.ReactNode;
}

const VARIANTS = {
  display: { size: 44, weight: "600", lineHeight: 52, letterSpacing: -1 },
  titleLarge: { size: 24, weight: "600", lineHeight: 30, letterSpacing: -0.3 },
  title: { size: 17, weight: "600", lineHeight: 24, letterSpacing: 0 },
  body: { size: 15, weight: "400", lineHeight: 22, letterSpacing: 0 },
  label: { size: 13, weight: "500", lineHeight: 18, letterSpacing: 0.2 },
  caption: { size: 12, weight: "400", lineHeight: 16, letterSpacing: 0.2 },
} as const;

export function AppText({
  variant = "body",
  tone = "default",
  tabular = false,
  color,
  children,
  style,
  ...rest
}: AppTextProps): React.JSX.Element {
  const { theme, textScale } = useTheme();
  const v = VARIANTS[variant];
  const resolvedColor =
    color ??
    (tone === "secondary"
      ? theme.colors.textSecondary
      : tone === "muted"
        ? theme.colors.textMuted
        : tone === "accent"
          ? theme.colors.accent
          : tone === "available"
            ? theme.colors.available
            : tone === "warning"
              ? theme.colors.warning
              : tone === "danger"
                ? theme.colors.danger
                : theme.colors.text);

  return (
    <Text
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? "text"}
      style={[
        {
          color: resolvedColor,
          fontSize: v.size * textScale,
          lineHeight: v.lineHeight * textScale,
          fontWeight: v.weight,
          letterSpacing: v.letterSpacing,
        },
        tabular && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
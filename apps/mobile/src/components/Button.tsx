import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger" | "accent";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const MIN_HEIGHT = 48; // Android touch target

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const { theme } = useTheme();

  const background =
    variant === "primary"
      ? theme.colors.accent
      : variant === "accent"
        ? theme.colors.focus
        : variant === "danger"
          ? theme.colors.danger
          : "transparent";

  const foreground =
    variant === "primary"
      ? theme.colors.onAccent
      : variant === "ghost"
        ? theme.colors.text
        : variant === "danger"
          ? theme.colors.onAccent
          : "#FFFFFF";

  const borderColor =
    variant === "ghost" ? theme.colors.borderStrong : variant === "accent" ? theme.colors.focus : background;

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_HEIGHT,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.md,
          backgroundColor: background,
          borderWidth: 1,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.spacing.sm,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : null}
      <AppText variant="label" color={foreground}>
        {label}
      </AppText>
    </Pressable>
  );
}
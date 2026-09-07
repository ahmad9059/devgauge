import { View, type ViewProps } from "react-native";

import { useTheme } from "../theme";

interface SurfaceProps extends ViewProps {
  variant?: "raised" | "flat" | "sunken";
  radius?: "sm" | "md" | "lg" | "xl" | "pill";
  padded?: boolean;
  bordered?: boolean;
  children?: React.ReactNode;
}

export function Surface({
  variant = "raised",
  radius = "lg",
  padded = false,
  bordered = true,
  style,
  children,
  ...rest
}: SurfaceProps): React.JSX.Element {
  const { theme } = useTheme();
  const background =
    variant === "raised"
      ? theme.colors.surfaceRaised
      : variant === "sunken"
        ? theme.colors.surfaceSunken
        : theme.colors.surface;

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: background,
          borderRadius: theme.radius[radius],
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
import { View } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

export type PillStatus = "available" | "warning" | "danger" | "neutral" | "unknown";

interface StatusPillProps {
  status: PillStatus;
  label: string;
}

const COLOR: Record<PillStatus, (t: ReturnType<typeof useTheme>["theme"]) => string> = {
  available: (t) => t.colors.available,
  warning: (t) => t.colors.warning,
  danger: (t) => t.colors.danger,
  neutral: (t) => t.colors.textSecondary,
  unknown: (t) => t.colors.textMuted,
};

export function StatusPill({ status, label }: StatusPillProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLOR[status](theme),
        }}
      />
      <AppText variant="label" color={COLOR[status](theme)}>
        {label}
      </AppText>
    </View>
  );
}
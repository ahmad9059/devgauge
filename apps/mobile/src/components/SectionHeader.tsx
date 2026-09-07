import { View } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

interface SectionHeaderProps {
  label: string;
}

export function SectionHeader({ label }: SectionHeaderProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.sm,
      }}
    >
      <AppText variant="label" tone="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </AppText>
    </View>
  );
}
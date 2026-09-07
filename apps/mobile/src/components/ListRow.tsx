import { Pressable, View } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

interface ListRowProps {
  title: string;
  subtitle?: string | undefined;
  right?: React.ReactNode;
  onPress?: (() => void) | undefined;
  destructive?: boolean;
}

export function ListRow({ title, subtitle, right, onPress, destructive = false }: ListRowProps): React.JSX.Element {
  const { theme } = useTheme();

  const content = (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="body" tone={destructive ? "danger" : "default"}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? undefined : { disabled: true }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {content}
      {right ? <View>{right}</View> : null}
      {onPress ? (
        <AppText variant="body" tone="muted">
          ›
        </AppText>
      ) : null}
    </Pressable>
  );
}
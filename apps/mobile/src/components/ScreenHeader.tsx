import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: theme.radius.md,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <AppText variant="titleLarge" style={{ fontSize: 30, lineHeight: 34 }}>
          ‹
        </AppText>
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText variant="titleLarge" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

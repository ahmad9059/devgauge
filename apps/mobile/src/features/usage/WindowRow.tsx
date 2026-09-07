import { Pressable, View } from "react-native";

import type { UsageWindow } from "@devgauge/contracts";

import { AppText, StatusPill, useTheme } from "../../components";
import { formatCountdown, formatPercent } from "../../utils/format";

interface WindowRowProps {
  window: UsageWindow;
  onPress?: (() => void) | undefined;
}

export function WindowRow({ window, onPress }: WindowRowProps): React.JSX.Element {
  const { theme } = useTheme();
  const statePill =
    window.state === "limited" ? (
      <StatusPill status="danger" label="Limited" />
    ) : window.state === "warning" ? (
      <StatusPill status="warning" label="High usage" />
    ) : null;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${window.label}: ${formatPercent(window.usedPercent)} used, resets ${formatCountdown(window.resetsAt)}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body">{window.label}</AppText>
        <AppText variant="caption" tone="muted">
          {formatCountdown(window.resetsAt)}
        </AppText>
      </View>
      {statePill ? <View>{statePill}</View> : null}
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <AppText variant="title" tabular>
          {formatPercent(window.usedPercent)}
        </AppText>
        <AppText variant="caption" tone="muted" tabular>
          {formatPercent(window.remainingPercent)} left
        </AppText>
      </View>
    </Pressable>
  );
}
import { View } from "react-native";

import { AppText } from "./AppText";
import { Button } from "./Button";
import { useTheme } from "../theme";

interface EmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${body}`}
      style={{
        padding: theme.spacing.xxl,
        alignItems: "center",
        gap: theme.spacing.md,
      }}
    >
      <AppText variant="titleLarge" tone="secondary">
        {title}
      </AppText>
      <AppText variant="body" tone="muted" style={{ textAlign: "center" }}>
        {body}
      </AppText>
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button label={actionLabel} onPress={onAction} variant="ghost" />
        </View>
      ) : null}
    </View>
  );
}
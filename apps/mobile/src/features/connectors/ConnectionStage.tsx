import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import type { ProviderConnection, ProviderId } from "@devgauge/contracts";

import { AppText, Button, PROVIDER_LABELS, ProviderMark, StatusPill, useTheme } from "../../components";
import { formatAge } from "../../utils/format";

interface ConnectionStageProps {
  provider: ProviderId;
  connection: ProviderConnection;
}

const METHOD: Record<ProviderId, string> = {
  "claude-code": "Desktop companion",
  codex: "ChatGPT device-code login",
  "opencode-go": "API key",
  "github-copilot": "GitHub OAuth",
};

const DATA_ACCESS: Record<ProviderId, string> = {
  "claude-code": "Status-line usage only",
  codex: "Quota + token activity",
  "opencode-go": "Usage percentages",
  "github-copilot": "Quota entitlements",
};

export function ConnectionStage({ provider, connection }: ConnectionStageProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const connected = connection.state === "connected";

  const status =
    connection.state === "connected" ? (
      <StatusPill status="available" label="Connected" />
    ) : connection.state === "reauth_required" ? (
      <StatusPill status="warning" label="Reauth needed" />
    ) : connection.state === "degraded" ? (
      <StatusPill status="warning" label="Degraded" />
    ) : (
      <StatusPill status="neutral" label="Disconnected" />
    );

  const actionLabel =
    connection.state === "connected"
      ? "Manage"
      : connection.state === "reauth_required"
        ? "Reconnect"
        : "Connect";

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <Pressable
        accessibilityRole={connected ? "button" : undefined}
        accessibilityLabel={`${PROVIDER_LABELS[provider]} connection`}
        onPress={connected ? () => router.push(`/provider/${provider}`) : undefined}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
          <ProviderMark provider={provider} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">{PROVIDER_LABELS[provider]}</AppText>
            <AppText variant="caption" tone="muted">
              {METHOD[provider]} · {DATA_ACCESS[provider]}
            </AppText>
          </View>
          {status}
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="caption" tone="muted">
          {connected
            ? `Verified ${formatAge(connection.lastVerifiedAt)}`
            : "Connect to start tracking usage"}
        </AppText>
        <Button
          label={actionLabel}
          variant={connected ? "ghost" : "primary"}
          onPress={() => router.push(`/connect/${provider}`)}
        />
      </View>
    </View>
  );
}
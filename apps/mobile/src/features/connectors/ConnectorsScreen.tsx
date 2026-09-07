import { useEffect, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderConnection } from "@devgauge/contracts";

import { AppText, EmptyState, Skeleton, Surface, useTheme } from "../../components";
import { providerConnections } from "../../data/mock-usage-repository";
import { ConnectionStage } from "./ConnectionStage";

export function ConnectorsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);

  useEffect(() => {
    let cancelled = false;
    void providerConnections()
      .then((data) => {
        if (!cancelled) setConnections(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const contentWidth = Math.min(width, 640);
  const connectedCount = connections.filter((c) => c.state === "connected").length;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.xs,
        }}
      >
        <AppText variant="titleLarge" accessibilityRole="header">
          Connectors
        </AppText>
        <AppText variant="caption" tone="muted">
          {loading ? "Loading…" : `${connectedCount} of 4 connected`}
        </AppText>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg, width: contentWidth, alignSelf: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <Surface key={i} padded style={{ gap: theme.spacing.md }}>
              <Skeleton height={40} radius="pill" width={200} />
              <Skeleton height={40} width="100%" />
            </Surface>
          ))}
        </ScrollView>
      ) : connections.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState title="Nothing here yet" body="Connections will appear here." />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xxxl,
            gap: theme.spacing.lg,
            width: contentWidth,
            alignSelf: "center",
          }}
        >
          {connections.map((connection) => (
            <ConnectionStage key={connection.provider} provider={connection.provider} connection={connection} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
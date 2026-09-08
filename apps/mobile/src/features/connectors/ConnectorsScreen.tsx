import { useCallback, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderConnection } from "@devgauge/contracts";

import { AppText, EmptyState, Skeleton, Surface, useTheme } from "../../components";
import { useFocusEffect } from "expo-router";
import { api } from "../../api/client";
import { orderConnections } from "../../data/repository";
import { ConnectionStage } from "./ConnectionStage";

export function ConnectorsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void api
        .connections()
        .then((data) => {
          if (!cancelled) setConnections(orderConnections(data.connections));
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

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
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title="Couldn&rsquo;t load connectors"
            body="Check your connection and pull to retry."
            actionLabel="Retry"
            onAction={() => {
              setError(false);
              setLoading(true);
              void api.connections().then((data) => {
                setConnections(orderConnections(data.connections));
                setLoading(false);
              }).catch(() => {
                setError(true);
                setLoading(false);
              });
            }}
          />
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

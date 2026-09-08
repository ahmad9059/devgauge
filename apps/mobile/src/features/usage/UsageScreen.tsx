import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter , useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderConnection, ProviderUsage } from "@devgauge/contracts";

import { AppText, Button, EmptyState, Skeleton, Surface, useTheme } from "../../components";
import { orderedProviders, loadUsage } from "../../data/repository";
import { formatAge } from "../../utils/format";
import { ProviderStage } from "./ProviderStage";

export function UsageScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Record<string, ProviderUsage>>({});
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    const result = await loadUsage({ cancelled: !mounted.current });
    if (!mounted.current) return;
    setLoading(result.usage.kind === "loading");
    setUsage(result.usage.data);
    setConnections(result.connections);
    setFromCache(result.usage.fromCache);
    if (result.usage.kind === "retained-error" || result.usage.kind === "blocking-error") {
      setSyncError(result.usage.error ?? "Could not reach DevGauge");
    } else {
      setSyncError(null);
    }
    if (background) setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const connectionByProvider = new Map(connections.map((c) => [c.provider, c]));
  const connectedCount = orderedProviders().filter(
    (provider) => connectionByProvider.get(provider)?.state === "connected"
  ).length;
  const lastSync = orderedProviders()
    .map((provider) => usage[provider]?.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const contentWidth = Math.min(width, 640);

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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="titleLarge" accessibilityRole="header">
            Usage
          </AppText>
          <Button
            label={refreshing ? "Syncing…" : "Sync"}
            variant="ghost"
            disabled={refreshing}
            onPress={() => void load(true)}
          />
        </View>
        <AppText variant="caption" tone="muted">
          {loading
            ? "Loading…"
            : `${connectedCount} of 4 providers · last sync ${lastSync ? formatAge(lastSync) : "—"}${fromCache ? " · offline cache" : ""}`}
        </AppText>
        {syncError ? (
          <AppText variant="caption" tone="warning">
            Offline — showing saved data. {syncError}
          </AppText>
        ) : null}
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
            width: contentWidth,
            alignSelf: "center",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Surface key={i} padded style={{ gap: theme.spacing.lg }}>
              <Skeleton height={40} radius="pill" width={160} />
              <Skeleton height={54} width={120} />
              <Skeleton height={56} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </Surface>
          ))}
        </ScrollView>
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
          {connectedCount === 0 ? (
            <View style={{ paddingVertical: theme.spacing.xxl }}>
              <EmptyState
                title="No providers connected"
                body="Connect a provider to start tracking your AI coding usage."
                actionLabel="Open Connectors"
                onAction={() => router.push("/connectors")}
              />
            </View>
          ) : null}
          {orderedProviders().map((provider) => {
            const providerUsage = usage[provider];
            if (!providerUsage && connectedCount === 0) return null;
            const connection =
              connectionByProvider.get(provider) ??
              ({
                provider,
                state: "disconnected",
                refresh: "idle",
                plan: null,
                adapterVersion: "",
                lastVerifiedAt: null,
                lastError: null,
                updatedAt: new Date().toISOString(),
              } satisfies ProviderConnection);
            return (
              <ProviderStage
                key={provider}
                provider={provider}
                usage={providerUsage}
                connection={connection}
                onOpenDetail={(p) => router.push(`/provider/${p}`)}
                onGoConnect={() => router.push("/connectors")}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

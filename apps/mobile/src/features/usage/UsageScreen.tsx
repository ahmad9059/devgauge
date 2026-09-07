import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderConnection, ProviderUsage } from "@devgauge/contracts";

import {
  AppText,
  Button,
  EmptyState,
  Skeleton,
  Surface,
  useTheme,
} from "../../components";
import { providerConnections, providerUsageList } from "../../data/mock-usage-repository";
import { readUsageCache, writeUsageCache } from "../../storage/usage-cache";
import { formatAge } from "../../utils/format";
import { ProviderStage } from "./ProviderStage";

export function UsageScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usage, setUsage] = useState<ProviderUsage[]>([]);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    setError(false);
    try {
      const [u, c] = await Promise.all([providerUsageList(), providerConnections()]);
      setUsage(u);
      setConnections(c);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Render cached data instantly when present (honest offline startup).
    void readUsageCache().then((cached) => {
      if (cancelled || !cached) return;
      setUsage(cached.providers);
      setFromCache(true);
    });
    void providerUsageList()
      .then((u) => {
        if (cancelled) return;
        setUsage(u);
        setFromCache(false);
        void writeUsageCache(u);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void providerConnections()
      .then((c) => {
        if (!cancelled) setConnections(c);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connectionByProvider = new Map(connections.map((c) => [c.provider, c]));
  const connectedCount = usage.filter((u) => connectionByProvider.get(u.provider)?.state === "connected").length;
  const lastSync = usage.find((u) => u.fetchedAt)?.fetchedAt;

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
            : `${connectedCount} of 4 providers · last sync ${formatAge(lastSync)}${fromCache ? " · offline cache" : ""}`}
        </AppText>
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
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title="Couldn&rsquo;t load usage"
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => void load()}
          />
        </View>
      ) : connectedCount === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title="No providers connected"
            body="Connect a provider to start tracking your AI coding usage."
            actionLabel="Open Connectors"
            onAction={() => router.push("/connectors")}
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
          {usage.map((u) => {
            const connection =
              connectionByProvider.get(u.provider) ??
              ({
                provider: u.provider,
                state: "disconnected",
                refresh: "idle",
                plan: null,
                adapterVersion: "",
                lastVerifiedAt: null,
                lastError: null,
                updatedAt: u.fetchedAt,
              } satisfies ProviderConnection);
            return (
              <ProviderStage
                key={u.provider}
                provider={u.provider}
                usage={u}
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
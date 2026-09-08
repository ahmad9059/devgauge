import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View, useWindowDimensions } from "react-native";
import { randomUUID } from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderUsage } from "@devgauge/contracts";
import { PROVIDER_IDS } from "@devgauge/contracts";
import { api } from "../../api/client";

import {
  AppText,
  Button,
  EmptyState,
  PROVIDER_LABELS,
  ProviderMark,
  SegmentedControl,
  Skeleton,
  Sparkline,
  StatusPill,
  Surface,
  useTheme,
} from "../../components";
import { loadHistory } from "../../data/repository";
import { formatAbsolute, formatAge, formatCountdown, formatNumber, formatPercent } from "../../utils/format";

const RANGES = [
  { label: "24h", value: "24h", ms: 24 * 3_600_000 },
  { label: "7d", value: "7d", ms: 7 * 86_400_000 },
  { label: "30d", value: "30d", ms: 30 * 86_400_000 },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

export function ProviderDetailScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const provider = (PROVIDER_IDS as readonly string[]).includes(providerId ?? "")
    ? (providerId as (typeof PROVIDER_IDS)[number])
    : undefined;

  const [usage, setUsage] = useState<ProviderUsage | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [range, setRange] = useState<RangeValue>("24h");
  const [windowId, setWindowId] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const [u, cs] = await Promise.all([api.providerUsage(provider), api.connections()]);
        if (!cancelled) return;
        setUsage(u);
        setLoadError(false);
        const connection = cs.connections.find((c) => c.provider === provider);
        setConnected(connection?.state === "connected");
        setWindowId((current) => current ?? u.windows[0]?.id ?? null);
      } catch {
        if (cancelled) setLoadError(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    if (!provider || !connected || !windowId) return;
    const to = new Date();
    const from = new Date(to.getTime() - (RANGES.find((r) => r.value === range)?.ms ?? RANGES[0]!.ms));
    let cancelled = false;
    void loadHistory({ provider, windowId, resolution: "raw", from: from.toISOString(), to: to.toISOString(), limit: 200 })
      .then((series) => {
        if (!cancelled) setHistory(series.points.map((point) => point.usedPercent ?? 0).reverse());
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, connected, windowId, range]);

  const chartWidth = Math.min(width, 640) - theme.spacing.lg * 4;
  const availableResetCredit = usage?.codex?.resetCredits?.credits?.find((credit) => credit.status === "available");
  const availableResetCount = usage?.codex?.resetCredits?.availableCount ?? 0;

  const awaitResetOutcome = async (attemptId: string): Promise<void> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const status = await api.codexResetCreditStatus(attemptId);
      if (!mounted.current) return;
      if (status.status === "failed") throw new Error("The reset credit was not redeemed. Your previous usage remains unchanged.");
      if (status.status === "completed") {
        const messages = {
          reset: "Reset credit used. Your updated Codex limits are now available.",
          alreadyRedeemed: "This request was already completed. No second credit was used.",
          nothingToReset: "No eligible rate-limit window currently needs a reset.",
          noCredit: "No earned reset credit is currently available.",
        } as const;
        setResetMessage(status.outcome ? messages[status.outcome] : "Reset request completed.");
        const refreshed = await api.providerUsage("codex");
        if (mounted.current) setUsage(refreshed);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    throw new Error("Reset verification is taking longer than expected. Check again shortly.");
  };

  const confirmResetCredit = (): void => {
    Alert.alert(
      "Use a reset credit?",
      "This redeems one earned credit and changes your ChatGPT/Codex allowance. DevGauge will refresh your limits before reporting success.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use credit",
          onPress: () => {
            setResetPending(true);
            setResetMessage(null);
            void api.consumeCodexResetCredit(randomUUID(), availableResetCredit?.id)
              .then((attempt) => awaitResetOutcome(attempt.attemptId))
              .catch((cause) => setResetMessage(cause instanceof Error ? cause.message : "Could not redeem this credit."))
              .finally(() => setResetPending(false));
          },
        },
      ]
    );
  };

  const onRefresh = async (): Promise<void> => {
    if (!provider) return;
    try {
      await api.providerRefresh(provider);
      const fresh = await api.providerUsage(provider);
      if (mounted.current) setUsage(fresh);
    } catch {
      if (mounted.current) setLoadError(true);
    }
  };

  const onDisconnect = (): void => {
    Alert.alert("Disconnect provider?", "DevGauge will stop tracking this provider. Historical data is preserved unless you delete it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          if (!provider) return;
          void api.connections().catch(() => {});
          setConnected(false);
          router.push("/connectors");
        },
      },
    ]);
  };

  const connectionPill = !provider ? null : connected ? (
    <StatusPill status="available" label="Connected" />
  ) : (
    <StatusPill status="neutral" label="Disconnected" />
  );

  const selectedWindow = usage?.windows.find((w) => w.id === windowId) ?? usage?.windows[0];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
        <Button label="‹" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} style={{ minWidth: 48, paddingHorizontal: 0 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="titleLarge" accessibilityRole="header">
            {provider ? PROVIDER_LABELS[provider] : "Provider"}
          </AppText>
          <AppText variant="caption" tone="muted">
            {usage ? `${usage.plan ?? "No plan"} · fetched ${formatAge(usage.fetchedAt)}` : "Loading…"}
          </AppText>
        </View>
        {connectionPill}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}
      >
        {!provider ? (
          <EmptyState title="Unknown provider" body="This provider is not recognized." actionLabel="Back" onAction={() => router.back()} />
        ) : loadError && !usage ? (
          <EmptyState
            title={`Couldn&rsquo;t load ${PROVIDER_LABELS[provider]}`}
            body="Check your connection and try again."
            actionLabel="Retry"
            onAction={() => {
              setLoadError(false);
              void (async () => {
                try {
                  const u = await api.providerUsage(provider);
                  if (mounted.current) setUsage(u);
                } catch {
                  if (mounted.current) setLoadError(true);
                }
              })();
            }}
          />
        ) : !usage ? (
          <Skeleton height={200} />
        ) : !connected ? (
          <EmptyState
            title={`${PROVIDER_LABELS[provider]} is not connected`}
            body="Connect it to start tracking usage and alerts."
            actionLabel="Connect"
            onAction={() => router.push(`/connect/${provider}`)}
          />
        ) : (
          <>
            <Surface padded style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                <ProviderMark provider={provider} />
                <View style={{ flex: 1 }}>
                  <AppText variant="body">{PROVIDER_LABELS[provider]}</AppText>
                  <AppText variant="caption" tone="muted">
                    Source: {usage.source} · fetched {formatAge(usage.fetchedAt)}
                  </AppText>
                </View>
              </View>

              {usage.windows.length > 1 ? (
                <SegmentedControl<string>
                  accessibilityLabel="Quota window"
                  options={usage.windows.map((w) => ({ label: w.label, value: w.id }))}
                  value={windowId ?? usage.windows[0]!.id}
                  onChange={(value) => setWindowId(value)}
                />
              ) : null}
              <SegmentedControl<RangeValue> accessibilityLabel="History range" options={RANGES} value={range} onChange={setRange} />

              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="title" tabular>
                  {formatPercent(selectedWindow?.usedPercent)} used
                </AppText>
                <AppText variant="caption" tone="muted">
                  {selectedWindow?.label ?? "window"} · {formatCountdown(selectedWindow?.resetsAt)}
                </AppText>
              </View>

              {history.length > 0 ? (
                <Sparkline
                  data={history}
                  width={chartWidth}
                  height={120}
                  color={theme.colors.provider[provider]}
                  accessibilityLabel={`${PROVIDER_LABELS[provider]} usage trend, ${range}.`}
                />
              ) : (
                <Skeleton height={120} />
              )}
            </Surface>

            <Section label="Current windows" />
            <Surface padded style={{ gap: theme.spacing.sm }}>
              {usage.windows.length > 0 ? (
                usage.windows.map((w) => (
                  <View key={w.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ gap: 2 }}>
                      <AppText variant="body">{w.label}</AppText>
                      <AppText variant="caption" tone="muted">
                        Resets {formatAbsolute(w.resetsAt)}
                      </AppText>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <AppText variant="title" tabular tone={w.state === "limited" ? "danger" : w.state === "warning" ? "warning" : "default"}>
                        {formatPercent(w.usedPercent)}
                      </AppText>
                      <AppText variant="caption" tone="muted" tabular>
                        {w.unit ? `${formatNumber(w.used)} / ${formatNumber(w.limit)} ${w.unit}` : `${formatPercent(w.remainingPercent)} remaining`}
                      </AppText>
                    </View>
                  </View>
                ))
              ) : (
                <AppText variant="caption" tone="muted">
                  This provider has not exposed any quota windows yet.
                </AppText>
              )}
            </Surface>

            {usage.activity ? (
              <>
                <Section label="Activity" />
                <Surface padded style={{ gap: theme.spacing.md }}>
                  <Metric label="Lifetime tokens" value={usage.activity.lifetimeTokens === null ? "Not provided" : formatNumber(usage.activity.lifetimeTokens)} />
                  <Metric label="Peak daily tokens" value={usage.activity.peakDailyTokens === null ? "Not provided" : formatNumber(usage.activity.peakDailyTokens)} />
                  <Metric label="Current streak" value={usage.activity.currentStreakDays === null ? "Not provided" : `${usage.activity.currentStreakDays} days`} />
                  <Metric label="Longest streak" value={usage.activity.longestStreakDays === null ? "Not provided" : `${usage.activity.longestStreakDays} days`} />
                  <Metric label="Longest turn" value={usage.activity.longestRunningTurnSec === null ? "Not provided" : `${Math.round(usage.activity.longestRunningTurnSec / 60)}m`} />
                </Surface>
              </>
            ) : null}

            {provider === "codex" && availableResetCount > 0 ? (
              <>
                <Section label="Earned reset" />
                <Surface padded style={{ gap: theme.spacing.md }}>
                  <AppText variant="body">{availableResetCredit?.title ?? `${availableResetCount} reset credit${availableResetCount === 1 ? "" : "s"} available`}</AppText>
                  <AppText variant="caption" tone="muted">
                    {availableResetCredit?.description ?? "Use only when you want to reset an eligible Codex rate-limit window."}
                  </AppText>
                  {resetMessage ? <AppText variant="caption" tone={resetMessage.startsWith("Could") ? "danger" : "available"}>{resetMessage}</AppText> : null}
                  <Button label={resetPending ? "Requesting…" : "Use a reset credit"} disabled={resetPending} onPress={confirmResetCredit} />
                </Surface>
              </>
            ) : null}

            <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
              <Button label="Refresh" variant="ghost" onPress={() => void onRefresh()} style={{ flex: 1 }} />
              <Button label="Disconnect" variant="danger" onPress={onDisconnect} style={{ flex: 1 }} />
            </View>
            <Button label="Export usage data" variant="ghost" onPress={() => router.push(`/settings/data`)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label }: { label: string }): React.JSX.Element {
  return (
    <View>
      <AppText variant="label" tone="muted" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </AppText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <AppText variant="body" tone="secondary">
        {label}
      </AppText>
      <AppText variant="body" tabular>
        {value}
      </AppText>
    </View>
  );
}

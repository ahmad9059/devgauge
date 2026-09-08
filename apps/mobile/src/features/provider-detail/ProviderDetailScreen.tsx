import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProviderUsage } from "@devgauge/contracts";
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
import {
  historySeries,
  providerConnections,
  providerUsage,
  type HistoryRange,
} from "../../data/mock-usage-repository";
import { formatAbsolute, formatAge, formatCountdown, formatNumber, formatPercent } from "../../utils/format";

const RANGES: readonly { label: string; value: HistoryRange }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

export function ProviderDetailScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const provider = (providerId ?? "opencode-go") as Parameters<typeof providerUsage>[0];

  const [usage, setUsage] = useState<ProviderUsage | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [range, setRange] = useState<HistoryRange>("24h");
  const [connected, setConnected] = useState(true);
  const [resetPending, setResetPending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  useEffect(() => {
    const usageRequest = provider === "codex" ? api.providerUsage(provider).catch(() => providerUsage(provider)) : providerUsage(provider);
    const connectionsRequest = provider === "codex" ? api.connections().then((r) => r.connections).catch(() => providerConnections()) : providerConnections();
    void usageRequest.then(setUsage);
    void connectionsRequest.then((cs) => {
      const found = cs.find((c) => c.provider === provider);
      setConnected(found?.state === "connected");
    });
  }, [provider]);

  useEffect(() => {
    const windowId = usage?.windows[0]?.id ?? "primary";
    void historySeries(provider, windowId, range).then(setHistory);
  }, [provider, range, usage?.windows]);

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
            void api.consumeCodexResetCredit(globalThis.crypto.randomUUID(), availableResetCredit?.id)
              .then((attempt) => awaitResetOutcome(attempt.attemptId))
              .catch((cause) => setResetMessage(cause instanceof Error ? cause.message : "Could not redeem this credit."))
              .finally(() => setResetPending(false));
          },
        },
      ]
    );
  };

  const connectionPill = connected ? (
    <StatusPill status="available" label="Connected" />
  ) : (
    <StatusPill status="neutral" label="Disconnected" />
  );

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
        <Button label="‹" variant="ghost" onPress={() => router.back()} style={{ minWidth: 48, paddingHorizontal: 0 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="titleLarge" accessibilityRole="header">
            {PROVIDER_LABELS[provider]}
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
        {!usage ? (
          <>
            <Skeleton height={44} width={140} />
            <Skeleton height={200} />
            <Skeleton height={160} />
          </>
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

              <SegmentedControl<HistoryRange> options={RANGES} value={range} onChange={setRange} />

              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="title" tabular>
                  {formatPercent(usage.windows[0]?.usedPercent)} used
                </AppText>
                <AppText variant="caption" tone="muted">
                  {usage.windows[0]?.label ?? "window"} · {formatCountdown(usage.windows[0]?.resetsAt)}
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
              {usage.windows.map((w) => (
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
              ))}
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
              <Button label="Refresh" variant="ghost" onPress={() => void providerUsage(provider).then(setUsage)} style={{ flex: 1 }} />
              <Button
                label={connected ? "Disconnect" : "Connect"}
                variant={connected ? "danger" : "primary"}
                onPress={() => router.push(`/connect/${provider}`)}
                style={{ flex: 1 }}
              />
            </View>
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

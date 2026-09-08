import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import type { ProviderConnection, ProviderId, ProviderUsage } from "@devgauge/contracts";

import {
  AppText,
  Button,
  ProviderMark,
  PROVIDER_LABELS,
  Skeleton,
  Sparkline,
  StatusPill,
  useTheme,
} from "../../components";
import { loadHistory } from "../../data/repository";
import { formatAge, formatCountdown, formatPercent, getMostActionableWindow } from "../../utils/format";
import { WindowRow } from "./WindowRow";

interface ProviderStageProps {
  provider: ProviderId;
  usage: ProviderUsage | undefined;
  connection: ProviderConnection;
  onOpenDetail: (provider: ProviderId) => void;
  onGoConnect: () => void;
}

export function ProviderStage({
  provider,
  usage,
  connection,
  onOpenDetail,
  onGoConnect,
}: ProviderStageProps): React.JSX.Element {
  const { theme } = useTheme();
  const connected = connection.state === "connected";
  const [history, setHistory] = useState<number[]>([]);
  const actionable = usage ? getMostActionableWindow(usage.windows) : undefined;
  const actionableId = actionable?.id;

  useEffect(() => {
    if (!connected || !actionableId) return;
    let cancelled = false;
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 3_600_000);
    void loadHistory({
      provider,
      windowId: actionableId,
      resolution: "raw",
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 50,
    })
      .then((series) => {
        if (!cancelled) setHistory(series.points.map((point) => point.usedPercent ?? 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [provider, connected, actionableId]);

  const statusPill = !connected ? null : !usage ? (
    <StatusPill status="neutral" label="No data" />
  ) : actionable?.state === "limited" ? (
    <StatusPill status="danger" label="Limited" />
  ) : actionable?.state === "warning" ? (
    <StatusPill status="warning" label="High usage" />
  ) : usage.stale ? (
    <StatusPill status="warning" label="Stale" />
  ) : (
    <StatusPill status="available" label="Synced" />
  );

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${PROVIDER_LABELS[provider]} usage`}
        onPress={() => connected && onOpenDetail(provider)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <ProviderMark provider={provider} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title">{PROVIDER_LABELS[provider]}</AppText>
          <AppText variant="caption" tone="muted">
            {usage?.plan ?? "—"} · {usage ? formatAge(usage.fetchedAt) : "No snapshot yet"}
          </AppText>
        </View>
        {statusPill}
      </Pressable>

      {connected ? (
        usage ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${PROVIDER_LABELS[provider]} most actionable window`}
              onPress={() => onOpenDetail(provider)}
              style={({ pressed }) => ({ gap: theme.spacing.xs, opacity: pressed ? 0.7 : 1 })}
            >
              <AppText
                variant="display"
                tone={actionable?.state === "limited" ? "danger" : actionable?.state === "warning" ? "warning" : "default"}
                tabular
                style={{ fontSize: 46, lineHeight: 54 }}
              >
                {formatPercent(actionable?.usedPercent)}
              </AppText>
              <AppText variant="label" tone="secondary">
                {actionable?.label ?? "quota"} window · {formatPercent(actionable?.remainingPercent)} remaining
              </AppText>
              <AppText variant="caption" tone="muted">
                Resets {formatCountdown(actionable?.resetsAt)}
              </AppText>
            </Pressable>

            <View>
              {history.length > 0 ? (
                <Sparkline
                  data={history}
                  width={280}
                  height={56}
                  color={actionable?.state === "limited" ? theme.colors.danger : theme.colors.provider[provider]}
                  accessibilityLabel={`${PROVIDER_LABELS[provider]} usage trend, 24 hours.`}
                />
              ) : (
                <Skeleton height={56} radius="md" />
              )}
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              {usage.windows.length > 0 ? (
                usage.windows.map((w) => (
                  <WindowRow key={w.id} window={w} onPress={() => onOpenDetail(provider)} />
                ))
              ) : (
                <AppText variant="caption" tone="muted">
                  This provider has not exposed any quota windows yet.
                </AppText>
              )}
            </View>
          </>
        ) : (
          <View style={{ gap: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
            <Skeleton height={54} width={120} />
            <Skeleton height={56} radius="md" />
            <AppText variant="body" tone="secondary">
              Waiting for the first confirmed snapshot.
            </AppText>
            <Button label="Open provider" variant="ghost" onPress={() => onOpenDetail(provider)} />
          </View>
        )
      ) : (
        <View style={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.sm }}>
          <AppText variant="body" tone="secondary">
            Not connected. Connect {PROVIDER_LABELS[provider]} to see live usage.
          </AppText>
          <Button label="Connect in Connectors" variant="ghost" onPress={onGoConnect} />
        </View>
      )}
    </View>
  );
}

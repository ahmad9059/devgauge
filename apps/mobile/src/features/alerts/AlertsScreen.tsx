import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter , useFocusEffect } from "expo-router";

import type { AlertRule } from "@devgauge/contracts";

import { AppText, Button, EmptyState, ListRow, PROVIDER_LABELS, ScreenHeader, Surface, useTheme } from "../../components";
import { loadAlerts } from "../../data/repository";
import { api } from "../../api/client";

export function AlertsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void loadAlerts()
        .then((data) => {
          if (!cancelled) setRules(data);
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

  const removeRule = async (rule: AlertRule): Promise<void> => {
    try {
      await api.deleteAlert(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
    } catch {
      setError(true);
    }
  };

  const kindLabel = (rule: AlertRule): string => {
    const map: Record<AlertRule["kind"], string> = {
      consumed_threshold: `Over ${rule.threshold}% used`,
      remaining_threshold: `Under ${rule.threshold}% left`,
      provider_limited: "Provider limited",
      reset_observed: "Reset observed",
      data_stale: "Data stale",
      reauthentication_required: "Reauth required",
      companion_offline: "Companion offline",
    };
    return `${rule.provider ? PROVIDER_LABELS[rule.provider] : "Any provider"} · ${map[rule.kind]}`;
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Alerts" subtitle="Threshold, stale, and provider alerts" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        {loading ? (
          <AppText variant="caption" tone="muted">
            Loading…
          </AppText>
        ) : error ? (
          <EmptyState title="Couldn&rsquo;t load alerts" body="Check your connection and try again." actionLabel="Retry" onAction={() => setError(false)} />
        ) : (
          <>
            <Button label="New alert rule" onPress={() => router.push("/settings/notifications/new")} />
            {rules.length === 0 ? (
              <EmptyState
                title="No alert rules yet"
                body="Create a rule to be notified when a provider crosses a threshold, goes stale, or needs attention."
              />
            ) : (
              <Surface>
                {rules.map((rule) => (
                  <ListRow
                    key={rule.id}
                    title={kindLabel(rule)}
                    subtitle={rule.enabled ? "Enabled" : "Disabled"}
                    right={
                      <View style={{ gap: theme.spacing.xs }}>
                        <Button label="Edit" variant="ghost" onPress={() => router.push(`/settings/notifications/${rule.id}`)} />
                        <Button label="Delete" variant="ghost" onPress={() => void removeRule(rule)} />
                      </View>
                    }
                  />
                ))}
              </Surface>
            )}
            <Button label="Delivery history" variant="ghost" onPress={() => router.push("/settings/notifications/history")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { AlertKind, AlertRuleInput } from "@devgauge/contracts";
import { PROVIDER_IDS } from "@devgauge/contracts";

import { AppText, Button, PROVIDER_LABELS, ScreenHeader, SegmentedControl, Surface, useTheme } from "../../components";
import { api } from "../../api/client";
import { loadAlerts } from "../../data/repository";

const KINDS: readonly { label: string; value: AlertKind }[] = [
  { label: "Over used %", value: "consumed_threshold" },
  { label: "Under remaining %", value: "remaining_threshold" },
  { label: "Provider limited", value: "provider_limited" },
  { label: "Reset observed", value: "reset_observed" },
  { label: "Data stale", value: "data_stale" },
  { label: "Reauth required", value: "reauthentication_required" },
];

const THRESHOLDS = [80, 90, 95];
const PROVIDER_OPTIONS: readonly { label: string; value: string }[] = [
  { label: "All providers", value: "" },
  ...PROVIDER_IDS.map((provider) => ({ label: PROVIDER_LABELS[provider] ?? provider, value: provider })),
];

export function AlertEditorScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);

  const [kind, setKind] = useState<AlertKind>("consumed_threshold");
  const [threshold, setThreshold] = useState<number>(80);
  const [provider, setProvider] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void loadAlerts().then((rules) => {
      if (cancelled) return;
      const rule = rules.find((item) => item.id === id);
      if (rule) {
        setKind(rule.kind);
        setThreshold(rule.threshold ?? 80);
        setProvider(rule.provider ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const requiresThreshold = kind === "consumed_threshold" || kind === "remaining_threshold";
  const providerValue = PROVIDER_OPTIONS.some((option) => option.value === provider) ? provider : "";

  const save = async (): Promise<void> => {
    if (requiresThreshold && !threshold) return;
    setSaving(true);
    const input: AlertRuleInput = {
      kind,
      threshold: requiresThreshold ? threshold : null,
      provider: (provider || null) as AlertRuleInput["provider"],
      windowId: null,
      hysteresis: 5,
      enabled: true,
      critical: false,
      preview: "generic",
      quietHours: null,
    };
    try {
      if (id) await api.updateAlert(id, input);
      else await api.createAlert(input);
      Alert.alert(editing ? "Alert updated" : "Alert created", "You will see an in-app alert the next time this rule fires.", [{ text: "OK" }]);
      router.back();
    } catch {
      Alert.alert("Could not save alert", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title={editing ? "Edit alert" : "New alert"} subtitle="Choose what DevGauge watches for" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        <Surface padded style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" tone="secondary">
              Provider
            </AppText>
            <SegmentedControl<string>
              accessibilityLabel="Provider"
              options={PROVIDER_OPTIONS}
              value={providerValue}
              onChange={setProvider}
            />
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" tone="secondary">
              Condition
            </AppText>
            <SegmentedControl<AlertKind> accessibilityLabel="Condition" options={KINDS} value={kind} onChange={setKind} />
          </View>
          {requiresThreshold ? (
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="label" tone="secondary">
                Threshold
              </AppText>
              <SegmentedControl<number>
                accessibilityLabel="Threshold"
                options={THRESHOLDS.map((value) => ({ label: `${value}%`, value }))}
                value={threshold}
                onChange={setThreshold}
              />
            </View>
          ) : null}
          <AppText variant="caption" tone="muted">
            Alerts fire once per reset cycle and never duplicate. You manage delivery in the notification settings.
          </AppText>
          <Button label={saving ? "Saving…" : "Save alert"} disabled={saving} onPress={() => void save()} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

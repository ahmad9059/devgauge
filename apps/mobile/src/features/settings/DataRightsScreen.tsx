import { Alert, Linking, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { PROVIDER_IDS } from "@devgauge/contracts";

import { AppText, Button, ListRow, ScreenHeader, Surface, useTheme , PROVIDER_LABELS } from "../../components";
import { api } from "../../api/client";

export function DataRightsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  const confirmDeleteAll = (): void => {
    Alert.alert("Delete all usage history?", "This permanently removes every stored usage snapshot. Connections and alert rules are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete all",
        style: "destructive",
        onPress: () => {
          void api.deleteHistory().then(() => {
            Alert.alert("History deleted", "All stored usage history has been removed.");
          }).catch(() => {
            Alert.alert("Could not delete history", "Check your connection and try again.");
          });
        },
      },
    ]);
  };

  const confirmDeleteProvider = (provider: (typeof PROVIDER_IDS)[number]): void => {
    Alert.alert(`Delete ${PROVIDER_LABELS[provider]} history?`, "This permanently removes stored usage snapshots for this provider.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void api.deleteHistory(provider).then(() => {
            Alert.alert("History deleted", `All stored ${PROVIDER_LABELS[provider]} usage history has been removed.`);
          }).catch(() => {
            Alert.alert("Could not delete history", "Check your connection and try again.");
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Privacy & data" subtitle="Export or delete your usage data" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        <Surface padded style={{ gap: theme.spacing.md }}>
          <AppText variant="label" tone="secondary">
            Export
          </AppText>
          {PROVIDER_IDS.map((provider) => (
            <View key={provider} style={{ gap: theme.spacing.sm }}>
              <AppText variant="body">{PROVIDER_LABELS[provider]}</AppText>
              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <Button
                  label="CSV"
                  variant="ghost"
                  style={{ flex: 1 }}
                  onPress={() => void Linking.openURL(api.dataExportUrl(provider, "csv"))}
                />
                <Button
                  label="JSON"
                  variant="ghost"
                  style={{ flex: 1 }}
                  onPress={() => void Linking.openURL(api.dataExportUrl(provider, "json"))}
                />
              </View>
            </View>
          ))}
          <AppText variant="caption" tone="muted">
            Exports contain only normalized usage and never include credentials or raw provider payloads.
          </AppText>
        </Surface>

        <Surface padded style={{ gap: theme.spacing.md }}>
          <AppText variant="label" tone="secondary">
            Delete history
          </AppText>
          {PROVIDER_IDS.map((provider) => (
            <Button key={provider} label={`Delete ${PROVIDER_LABELS[provider]} history`} variant="ghost" onPress={() => confirmDeleteProvider(provider)} />
          ))}
          <Button label="Delete all usage history" variant="danger" onPress={confirmDeleteAll} />
        </Surface>

        <Surface>
          <ListRow title="Sessions & devices" subtitle="Manage active sessions and companion devices" onPress={() => router.push("/settings/sessions")} />
          <ListRow title="Delete account" subtitle="Permanently delete your account" destructive onPress={() => router.push("/settings/delete-account")} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

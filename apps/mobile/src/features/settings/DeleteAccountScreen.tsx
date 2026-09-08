import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, ScreenHeader, useTheme } from "../../components";
import { api } from "../../api/client";

export function DeleteAccountScreen(): React.JSX.Element {
  const { theme } = useTheme();

  const confirm = (): void => {
    Alert.alert("Delete account?", "This permanently deletes your account, connections, usage history, and alert rules. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete account",
        style: "destructive",
        onPress: () => {
          void api.deleteAccount().then((result) => {
            if ("pending" in result && result.pending) {
              Alert.alert("Account deletion started", "Your account is being deleted. Sign-out completes locally now.");
            } else {
              Alert.alert("Account deleted", "Your account and data have been removed.");
            }
          }).catch(() => {
            Alert.alert("Could not delete account", "Check your connection and try again.");
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Delete account" subtitle="Permanent and irreversible" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        <AppText variant="body" tone="secondary">
          Deleting your account removes stored provider connections and all usage history. Credentials and secrets are never recoverable.
        </AppText>
        <AppText variant="body" tone="secondary">
          A short deletion record is retained for abuse prevention and is not linked to your identity.
        </AppText>
        <Button label="Delete my account" variant="danger" onPress={confirm} />
      </ScrollView>
    </SafeAreaView>
  );
}

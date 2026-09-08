import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppText, ListRow, SectionHeader, SegmentedControl, Surface, useTheme } from "../../components";
import { useAuth } from "../../auth/AuthContext";
import { APP_TEXT_SCALES, type AppearanceMode } from "../../theme";

export function SettingsScreen(): React.JSX.Element {
  const { theme, appearance, setAppearance, textScale, setTextScale } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 640);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <AppText variant="titleLarge" accessibilityRole="header">
          Settings
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing.xxxl,
          width: contentWidth,
          alignSelf: "center",
        }}
      >
        <SectionHeader label="Appearance" />
        <Surface padded style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" tone="secondary">
              Theme
            </AppText>
            <SegmentedControl<AppearanceMode>
              accessibilityLabel="Theme"
              options={[
                { label: "System", value: "system" },
                { label: "Dark", value: "dark" },
                { label: "Light", value: "light" },
              ]}
              value={appearance}
              onChange={setAppearance}
            />
          </View>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" tone="secondary">
              App text size
            </AppText>
            <SegmentedControl<number>
              accessibilityLabel="App text size"
              options={APP_TEXT_SCALES.map((s) => ({ label: s.label, value: s.value }))}
              value={textScale}
              onChange={setTextScale}
            />
            <AppText variant="caption" tone="muted">
              Applies on top of your system text size and never disables it.
            </AppText>
          </View>
        </Surface>

        <SectionHeader label="Notifications & alerts" />
        <Surface>
          <ListRow
            title="Alerts"
            subtitle="Threshold, limited, stale, and reauth rules"
            onPress={() => router.push("/settings/notifications")}
          />
          <ListRow title="In-app alerts" subtitle="Review and acknowledge recent alerts" onPress={() => router.push("/settings/notifications/history")} />
        </Surface>

        <SectionHeader label="Security & sessions" />
        <Surface>
          <ListRow title="Active sessions & companion devices" subtitle="Manage paired devices" onPress={() => router.push("/settings/sessions")} />
          <ListRow title="Sign out" destructive onPress={() => void signOut()} />
        </Surface>

        <SectionHeader label="Privacy & data" />
        <Surface>
          <ListRow title="Export & delete usage data" subtitle="CSV/JSON export, delete history, delete account" onPress={() => router.push("/settings/data")} />
        </Surface>

        <SectionHeader label="Support" />
        <Surface>
          <ListRow title="App version" right={<AppText variant="caption" tone="muted">0.1.0</AppText>} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

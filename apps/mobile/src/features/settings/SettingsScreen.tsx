import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, ListRow, SectionHeader, SegmentedControl, StatusPill, Surface, useTheme } from "../../components";
import { useAuth } from "../../auth/AuthContext";
import { APP_TEXT_SCALES, type AppearanceMode } from "../../theme";

export function SettingsScreen(): React.JSX.Element {
  const { theme, appearance, setAppearance, textScale, setTextScale } = useTheme();
  const { signOut } = useAuth();
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

        <SectionHeader label="Notifications" />
        <Surface>
          <ListRow title="Local notifications" subtitle="Alerts from background refresh" right={<StatusPill status="available" label="On" />} />
          <ListRow title="Quiet hours" subtitle="Not configured" />
          <ListRow title="Threshold alerts" subtitle="80% · 95% presets" />
          <ListRow title="Stale data alerts" subtitle="15 minutes" />
        </Surface>

        <SectionHeader label="Security & sessions" />
        <Surface>
          <ListRow title="Active sessions" subtitle="1 device" onPress={() => {}} />
          <ListRow title="Companion devices" subtitle="Claude companion · 1 device" onPress={() => {}} />
          <ListRow title="Sign out" destructive onPress={() => void signOut()} />
        </Surface>

        <SectionHeader label="Privacy & data" />
        <Surface>
          <ListRow title="Export usage data" onPress={() => {}} />
          <ListRow title="Delete usage history" destructive onPress={() => {}} />
          <ListRow title="Delete account" destructive onPress={() => {}} />
        </Surface>

        <SectionHeader label="Support" />
        <Surface>
          <ListRow title="Diagnostics" subtitle="Version, adapters, last sync" onPress={() => {}} />
          <ListRow title="Provider status" onPress={() => {}} />
          <ListRow title="App version" right={<AppText variant="caption" tone="muted">0.1.0</AppText>} />
        </Surface>

        <SectionHeader label="Legal" />
        <Surface>
          <ListRow title="Privacy policy" onPress={() => {}} />
          <ListRow title="Terms" onPress={() => {}} />
          <ListRow title="Open-source licenses" onPress={() => {}} />
          <ListRow title="Provider acknowledgements" subtitle="Anthropic · OpenAI · OpenCode · GitHub" onPress={() => {}} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
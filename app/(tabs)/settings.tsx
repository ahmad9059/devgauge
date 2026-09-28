import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Header,
  Icon,
  ListRow,
  Notice,
  RowDivider,
  Screen,
  ScreenScroll,
  SectionTitle,
  Sheet,
  Stack,
} from '@/components/ui';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import {
  TEXT_SCALE_PRESETS,
  useTheme,
  type TextScale,
} from '@/design/theme-provider';
import type { ThemePreference } from '@/design/themes';
import { spacing } from '@/design/tokens';
import { saveTextScale, saveTheme } from '@/features/settings/settings-service';
import { getAppDatabase } from '@/services/app-database-store';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
}[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow the Android appearance setting',
  },
  { value: 'light', label: 'Light', description: 'Warm off-white surfaces' },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Near-black instrument surfaces',
  },
];

const TEXT_SCALE_LABELS: Record<TextScale, string> = {
  1: 'Default',
  1.15: 'Large',
  1.3: 'Larger',
  1.5: 'Largest',
};

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    typography,
    preference,
    setPreference,
    textScale,
    setTextScale,
  } = useTheme();
  const [themeSheet, setThemeSheet] = useState(false);
  const [textSheet, setTextSheet] = useState(false);
  const [dataSheet, setDataSheet] = useState(false);

  const version = Constants.expoConfig?.version ?? '0.1.0';
  const themeLabel =
    THEME_OPTIONS.find((option) => option.value === preference)?.label ??
    'System';

  // Persist appearance changes; a database failure never blocks the UI.
  const persistTheme = (value: ThemePreference) => {
    getAppDatabase()
      .then((db) => saveTheme(db, value, new Date()))
      .catch(() => undefined);
  };
  const persistTextScale = (value: TextScale) => {
    getAppDatabase()
      .then((db) => saveTextScale(db, value, new Date()))
      .catch(() => undefined);
  };

  return (
    <Screen>
      <ScreenScroll>
        <Header title="Settings" subtitle="Appearance, data, and privacy" />

        <SectionTitle>Appearance</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Theme"
              subtitle="Applied immediately; persisted in a later phase"
              trailing={
                <View style={styles.trailing}>
                  <Text
                    style={[
                      typography.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {themeLabel}
                  </Text>
                  <Icon
                    name="chevron-right"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </View>
              }
              onPress={() => setThemeSheet(true)}
            />
            <RowDivider />
            <ListRow
              title="Text size"
              subtitle="App-scaled on top of the system font setting"
              trailing={
                <View style={styles.trailing}>
                  <Text
                    style={[
                      typography.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {TEXT_SCALE_LABELS[textScale]}
                  </Text>
                  <Icon
                    name="chevron-right"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </View>
              }
              onPress={() => setTextSheet(true)}
            />
          </View>
        </Card>
        <Card>
          <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
            Preview
          </Text>
          <Text style={[typography.body, { color: theme.colors.textPrimary }]}>
            Resets in 2h 05m · 71% of the weekly window used
          </Text>
        </Card>

        <SectionTitle>Notifications</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Threshold alerts"
              subtitle="No notifications are scheduled in this phase"
              trailing={
                <Text
                  style={[typography.label, { color: theme.colors.textMuted }]}
                >
                  Off
                </Text>
              }
            />
            <RowDivider />
            <ListRow
              title="Reset reminders"
              subtitle="Configured later, only after you enable it"
              trailing={
                <Text
                  style={[typography.label, { color: theme.colors.textMuted }]}
                >
                  Off
                </Text>
              }
            />
          </View>
        </Card>

        <SectionTitle>Privacy &amp; Security</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Privacy policy"
              showChevron
              onPress={() => router.push('/legal/privacy')}
            />
            <RowDivider />
            <ListRow
              title="Terms of use"
              showChevron
              onPress={() => router.push('/legal/terms')}
            />
            <RowDivider />
            <ListRow
              title="Provider disclosures"
              showChevron
              onPress={() => router.push('/legal/providers')}
            />
          </View>
        </Card>

        <SectionTitle>Data</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Clear cached usage"
              subtitle="Removes stored snapshots but keeps connections"
              onPress={() => setDataSheet(true)}
            />
            <RowDivider />
            <ListRow
              title="Delete all local data"
              destructive
              subtitle="Removes connections, snapshots, and settings"
              onPress={() => setDataSheet(true)}
            />
          </View>
        </Card>

        <SectionTitle>Help &amp; About</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Support"
              showChevron
              onPress={() => router.push('/support')}
            />
            <RowDivider />
            <ListRow
              title="Licenses"
              showChevron
              onPress={() => router.push('/legal/licenses')}
            />
            {diagnosticsEnabled ? (
              <>
                <RowDivider />
                <ListRow
                  title="Diagnostics"
                  subtitle="Development and internal test builds only"
                  showChevron
                  onPress={() => router.push('/diagnostics')}
                />
              </>
            ) : null}
          </View>
        </Card>
        <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
          DevGauge {version}
        </Text>
      </ScreenScroll>

      <Sheet
        visible={themeSheet}
        title="Theme"
        onClose={() => setThemeSheet(false)}
      >
        {THEME_OPTIONS.map((option) => (
          <ListRow
            key={option.value}
            title={option.label}
            subtitle={option.description}
            selected={preference === option.value}
            trailing={
              preference === option.value ? (
                <Icon name="check" size={22} color={theme.colors.accent} />
              ) : undefined
            }
            onPress={() => {
              setPreference(option.value);
              persistTheme(option.value);
              setThemeSheet(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={textSheet}
        title="Text size"
        onClose={() => setTextSheet(false)}
      >
        <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
          Preview: 71% weekly · resets 2h 05m
        </Text>
        {TEXT_SCALE_PRESETS.map((scale) => (
          <ListRow
            key={scale}
            title={TEXT_SCALE_LABELS[scale]}
            subtitle={`${Math.round(scale * 100)}% of the base size`}
            selected={textScale === scale}
            trailing={
              textScale === scale ? (
                <Icon name="check" size={22} color={theme.colors.accent} />
              ) : undefined
            }
            onPress={() => {
              setTextScale(scale);
              persistTextScale(scale);
              setTextSheet(false);
            }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={dataSheet}
        title="Delete local data"
        onClose={() => setDataSheet(false)}
      >
        <Notice tone="warning" icon="alert-outline">
          This removes every connection, stored snapshot, and preference on this
          device. It cannot be undone.
        </Notice>
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          Data deletion is implemented in a later phase. Nothing is stored yet,
          so this is a preview of the confirmation step.
        </Text>
        <Stack gap="sm">
          <Button
            label="Delete everything"
            variant="danger"
            icon="delete-outline"
            onPress={() => setDataSheet(false)}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setDataSheet(false)}
          />
        </Stack>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardPad: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 0,
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

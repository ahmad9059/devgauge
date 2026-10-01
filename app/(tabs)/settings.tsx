import {
  useReloadProviders,
  useProviderViews,
} from '@/features/dashboard/app-providers';
import { useSyncStatus } from '@/features/dashboard/sync-provider';
import { createNotificationCanceller } from '@/services/notifications/canceller';
import { createExpoNotificationScheduler } from '@/services/notifications/expo-scheduler';
import { refreshUsageNotifications } from '@/services/notifications/usage-notifications';
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
import {
  getAppDatabase,
  resetAppDatabaseHandle,
} from '@/services/app-database-store';
import { clearCachedUsage, deleteAllLocalData } from '@/services/local-data';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';

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
  const reload = useReloadProviders();
  const providers = useProviderViews();
  const { cancelProvider, resetSync } = useSyncStatus();
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
  const [dataAction, setDataAction] = useState<null | 'cache' | 'delete'>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);

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

  const runClearCache = async () => {
    try {
      const db = await getAppDatabase();
      for (const provider of providers) cancelProvider(provider.id);
      const report = await clearCachedUsage(db);
      await refreshUsageNotifications(db, createExpoNotificationScheduler());
      await reload();
      setDataMessage(`Cleared ${report.snapshotsDeleted} cached snapshot(s).`);
    } catch {
      setDataMessage('Could not clear cached usage.');
    }
    setDataAction(null);
  };

  const runDeleteAll = async () => {
    try {
      const db = await getAppDatabase();
      const secretStore = createSecureStoreBackend();
      await resetSync();
      await deleteAllLocalData(db, {
        vault: createSecureVault(secretStore),
        secretStore,
        canceller: createNotificationCanceller(
          db,
          createExpoNotificationScheduler(),
        ),
      });
      await db.close();
      resetAppDatabaseHandle();
      await reload();
      setDataMessage(
        'App records, credentials and reminders deleted. Browser sign-in can remain.',
      );
    } catch {
      setDataMessage('Could not delete local data.');
    }
    setDataAction(null);
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
              subtitle="Applied immediately and saved on this device"
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

        <SectionTitle>Notifications</SectionTitle>
        <Card>
          <ListRow
            title="Usage alerts & resets"
            subtitle="Configure thresholds, quiet hours and local reminders"
            showChevron
            onPress={() => router.push('/notifications')}
          />
        </Card>

        <SectionTitle>Privacy &amp; Security</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Privacy policy"
              showChevron
              onPress={() => router.push('/legal/privacy')}
            />
            <ListRow
              title="Terms of use"
              showChevron
              onPress={() => router.push('/legal/terms')}
            />
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
              onPress={() => {
                setDataMessage(null);
                setDataAction('cache');
              }}
            />
            <ListRow
              title="Delete all local data"
              destructive
              subtitle="Removes connections, snapshots, credentials, and settings"
              onPress={() => {
                setDataMessage(null);
                setDataAction('delete');
              }}
            />
          </View>
        </Card>
        {dataMessage ? (
          <Notice tone="info" icon="information-outline">
            {dataMessage}
          </Notice>
        ) : null}

        <SectionTitle>Help &amp; About</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Support"
              showChevron
              onPress={() => router.push('/support')}
            />
            <ListRow
              title="Licenses"
              showChevron
              onPress={() => router.push('/legal/licenses')}
            />
            {diagnosticsEnabled ? (
              <>
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
          Resets in 2h 05m · 71% weekly used
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
        visible={dataAction !== null}
        title={
          dataAction === 'delete'
            ? 'Delete all local data'
            : 'Clear cached usage'
        }
        onClose={() => setDataAction(null)}
      >
        {dataAction === 'delete' ? (
          <Notice tone="warning" icon="alert-outline">
            This removes every connection, stored snapshot, credential, and
            preference on this device. It cannot be undone. Browser sign-in may
            remain; sign out on provider websites to remove it.
          </Notice>
        ) : (
          <Notice tone="warning" icon="alert-outline">
            This removes stored usage snapshots. Connections and settings are
            kept.
          </Notice>
        )}
        <Stack gap="sm">
          <Button
            label={
              dataAction === 'delete' ? 'Delete everything' : 'Clear cache'
            }
            variant={dataAction === 'delete' ? 'danger' : 'secondary'}
            icon={dataAction === 'delete' ? 'delete-outline' : 'broom'}
            onPress={dataAction === 'delete' ? runDeleteAll : runClearCache}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setDataAction(null)}
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

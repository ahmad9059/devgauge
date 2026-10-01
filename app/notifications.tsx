import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  Linking,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Header,
  ListRow,
  Notice,
  Screen,
  ScreenScroll,
  SectionTitle,
  Stack,
} from '@/components/ui';
import { useTheme } from '@/design/theme-provider';
import { spacing } from '@/design/tokens';
import { getAppDatabase } from '@/services/app-database-store';
import {
  createExpoNotificationScheduler,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/services/notifications/expo-scheduler';
import {
  listNotificationOperations,
  type NotificationOperation,
} from '@/services/notifications/reconciler';
import {
  refreshUsageNotifications,
  saveUsageRule,
} from '@/services/notifications/usage-notifications';
import {
  listNotificationRules,
  deleteNotificationRule,
} from '@/storage/repositories/notifications';
import { listConnections } from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import { listManualResetEntries } from '@/storage/repositories/manual-reset';
import {
  deleteManualResetReminder,
  saveManualResetReminder,
} from '@/features/connections/manual-reset';
import { ManualResetForm } from '@/features/connections/manual-reset-form';
import type {
  ManualResetEntry,
  NotificationRuleRecord,
  ProviderConnection,
  SnapshotWithWindows,
} from '@/storage/types';
import { withWriteTransaction } from '@/storage/write-transaction';

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  const { theme, typography } = useTheme();
  return (
    <Stack gap="xs">
      <Text style={[typography.label, { color: theme.colors.textPrimary }]}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        style={[
          styles.input,
          typography.body,
          {
            color: theme.colors.textPrimary,
            borderColor: theme.colors.controlBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />
    </Stack>
  );
}

export default function NotificationsScreen() {
  const { theme, typography } = useTheme();
  const [rules, setRules] = useState<NotificationRuleRecord[]>([]);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [latest, setLatest] = useState<Map<string, SnapshotWithWindows>>(
    new Map(),
  );
  const [operations, setOperations] = useState<NotificationOperation[]>([]);
  const [manual, setManual] = useState<ManualResetEntry[]>([]);
  const [permission, setPermission] = useState('Checking');
  const [canAskPermission, setCanAskPermission] = useState(false);
  const [draft, setDraft] = useState<NotificationRuleRecord | null>(null);
  const [value, setValue] = useState('80');
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [manualEdit, setManualEdit] = useState<ManualResetEntry | null>(null);
  const [timezoneConfirmed, setTimezoneConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    const db = await getAppDatabase();
    const [storedRules, accounts, snapshots, journal, entries, status] =
      await Promise.all([
        listNotificationRules(db),
        listConnections(db),
        latestByConnection(db),
        listNotificationOperations(db),
        listManualResetEntries(db),
        getNotificationPermission(),
      ]);
    setRules(storedRules.filter((rule) => !rule.id.startsWith('reset-rule-')));
    setConnections(
      accounts.filter(
        (account) => !['disconnected', 'disabled'].includes(account.status),
      ),
    );
    setLatest(snapshots);
    setOperations(journal);
    setManual(entries);
    setPermission(status.status);
    setCanAskPermission(status.canAskAgain && status.status !== 'granted');
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load().catch(() =>
        setMessage('Could not load notification settings. Retry.'),
      );
    }, [load]),
  );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not update reminders. Retry.',
      );
      AccessibilityInfo.announceForAccessibility('Could not update reminders.');
    } finally {
      setBusy(false);
    }
  };
  const edit = (rule: NotificationRuleRecord) => {
    setDraft(rule);
    setValue(
      String(
        rule.ruleType === 'threshold'
          ? Math.round((rule.threshold ?? 0.8) * 100)
          : (rule.leadMinutes ?? 15),
      ),
    );
    setQuietStart(rule.quietHoursStart ?? '');
    setQuietEnd(rule.quietHoursEnd ?? '');
    setManualEdit(null);
  };
  const add = (type: NotificationRuleRecord['ruleType']) => {
    const timestamp = new Date().toISOString();
    edit({
      id: `usage-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      providerId: connections[0]?.providerId ?? null,
      ruleType: type,
      enabled: true,
      connectionId: null,
      windowExternalKey: null,
      includeDetails: false,
      threshold: type === 'threshold' ? 0.8 : null,
      leadMinutes: type === 'reset-reminder' ? 15 : null,
      quietHoursStart: null,
      quietHoursEnd: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };
  const scopeAccounts = connections.filter(
    (connection) => connection.providerId === draft?.providerId,
  );
  const scopeWindows = [
    ...new Map(
      scopeAccounts
        .filter(
          (connection) =>
            !draft?.connectionId || connection.id === draft.connectionId,
        )
        .flatMap((connection) =>
          (latest.get(connection.id)?.windows ?? []).map(
            (window) => [window.externalKey, window.label] as const,
          ),
        ),
    ).entries(),
  ];
  const describeState = (ruleId: string) => {
    const related = operations.filter(
      (operation) => operation.rule_id === ruleId,
    );
    if (!related.length) return 'Waiting for matching usage or a known reset';
    return [...new Set(related.map((operation) => operation.state))].join(
      ' · ',
    );
  };
  return (
    <Screen edges={['left', 'right']}>
      <ScreenScroll>
        <Header
          title="Usage alerts & resets"
          subtitle="Rules and local reminders on this device"
        />
        <Card>
          <ListRow
            title="Android notification permission"
            subtitle={permission}
          />
          <Button
            label={
              canAskPermission
                ? 'Allow notifications'
                : 'Open Android notification settings'
            }
            variant="secondary"
            disabled={busy || permission === 'Checking'}
            onPress={() =>
              void run(async () => {
                if (canAskPermission) await requestNotificationPermission();
                else await Linking.openSettings();
                const db = await getAppDatabase();
                await refreshUsageNotifications(
                  db,
                  createExpoNotificationScheduler(),
                );
              })
            }
          />
          <Button
            label="Retry pending reminders"
            variant="ghost"
            loading={busy}
            onPress={() =>
              void run(async () => {
                const db = await getAppDatabase();
                await refreshUsageNotifications(
                  db,
                  createExpoNotificationScheduler(),
                );
              })
            }
          />
        </Card>
        <Notice tone="info" icon="information-outline">
          Thresholds are checked when usage syncs. Consumption while the app is
          closed cannot trigger a new threshold alert. Known reset reminders can
          run while the app is closed. Quiet hours follow this device’s timezone
          and defer reminders until they end.
        </Notice>
        {message ? (
          <Notice tone="warning" icon="alert-outline">
            {message}
          </Notice>
        ) : null}
        <SectionTitle>Usage rules</SectionTitle>
        {rules.map((rule) => (
          <Card key={rule.id}>
            <ListRow
              title={`${rule.providerId} · ${rule.ruleType === 'threshold' ? `${Math.round((rule.threshold ?? 0) * 100)}% threshold` : `${rule.leadMinutes ?? 0} min before reset`}`}
              subtitle={`${rule.enabled ? describeState(rule.id) : 'Off'} · ${rule.connectionId ? 'Selected account' : 'All accounts'} · ${rule.windowExternalKey ?? 'All windows'}`}
            />
            <Button
              label="Edit rule"
              variant="secondary"
              disabled={busy}
              onPress={() => edit(rule)}
            />
            <Button
              label="Delete rule"
              variant="ghost"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const db = await getAppDatabase();
                  await withWriteTransaction(db, (tx) =>
                    deleteNotificationRule(tx, rule.id),
                  );
                  await refreshUsageNotifications(
                    db,
                    createExpoNotificationScheduler(),
                  );
                  if (draft?.id === rule.id) setDraft(null);
                })
              }
            />
          </Card>
        ))}
        {!connections.length ? (
          <Notice tone="info" icon="information-outline">
            Connect a provider to configure usage alerts and reset reminders.
          </Notice>
        ) : (
          <Stack gap="sm">
            <Button
              label="Add threshold alert"
              variant="secondary"
              disabled={busy}
              onPress={() => add('threshold')}
            />
            <Button
              label="Add reset reminder"
              variant="secondary"
              disabled={busy}
              onPress={() => add('reset-reminder')}
            />
          </Stack>
        )}
        {draft ? (
          <Card>
            <SectionTitle>
              {draft.ruleType === 'threshold' ? 'Threshold rule' : 'Reset rule'}
            </SectionTitle>
            <Text
              style={[typography.label, { color: theme.colors.textPrimary }]}
            >
              Provider
            </Text>
            {[
              ...new Set(
                connections.map((connection) => connection.providerId),
              ),
            ].map((providerId) => (
              <ListRow
                key={providerId}
                title={providerId}
                selected={draft.providerId === providerId}
                onPress={() =>
                  setDraft({
                    ...draft,
                    providerId,
                    connectionId: null,
                    windowExternalKey: null,
                  })
                }
              />
            ))}
            <Text
              style={[typography.label, { color: theme.colors.textPrimary }]}
            >
              Account
            </Text>
            <ListRow
              title="All accounts for this provider"
              selected={!draft.connectionId}
              onPress={() =>
                setDraft({
                  ...draft,
                  connectionId: null,
                  windowExternalKey: null,
                })
              }
            />
            {scopeAccounts.map((connection) => (
              <ListRow
                key={connection.id}
                title={
                  connection.displayName ??
                  connection.accountHint ??
                  connection.providerId
                }
                selected={draft.connectionId === connection.id}
                onPress={() =>
                  setDraft({
                    ...draft,
                    connectionId: connection.id,
                    windowExternalKey: null,
                  })
                }
              />
            ))}
            <Text
              style={[typography.label, { color: theme.colors.textPrimary }]}
            >
              Window
            </Text>
            <ListRow
              title="All windows"
              selected={!draft.windowExternalKey}
              onPress={() => setDraft({ ...draft, windowExternalKey: null })}
            />
            {scopeWindows.map(([key, label]) => (
              <ListRow
                key={key}
                title={label}
                selected={draft.windowExternalKey === key}
                onPress={() => setDraft({ ...draft, windowExternalKey: key })}
              />
            ))}
            {draft.ruleType === 'threshold' ? (
              <View style={styles.presets}>
                {[50, 80, 90, 100].map((percent) => (
                  <Button
                    key={percent}
                    label={`${percent}%`}
                    variant="secondary"
                    onPress={() => setValue(String(percent))}
                  />
                ))}
              </View>
            ) : (
              <Notice tone="info" icon="clock-outline">
                Enter 0 for at-reset, or minutes before the provider-reported
                reset. Unknown reset times are never guessed.
              </Notice>
            )}
            <Field
              label={
                draft.ruleType === 'threshold'
                  ? 'Custom threshold (%)'
                  : 'Minutes before reset'
              }
              value={value}
              onChange={setValue}
              numeric
            />
            <Field
              label="Quiet hours start (optional)"
              value={quietStart}
              onChange={setQuietStart}
              placeholder="22:00"
            />
            <Field
              label="Quiet hours end (optional)"
              value={quietEnd}
              onChange={setQuietEnd}
              placeholder="08:00"
            />
            <ListRow
              title="Enabled"
              trailing={
                <Switch
                  accessibilityLabel="Rule enabled"
                  value={draft.enabled}
                  onValueChange={(enabled) => setDraft({ ...draft, enabled })}
                />
              }
            />
            <ListRow
              title="Include provider and window in notification"
              subtitle="May appear on your lock screen. Account details are always omitted."
              trailing={
                <Switch
                  accessibilityLabel="Include provider and window in notification"
                  value={draft.includeDetails ?? false}
                  onValueChange={(includeDetails) =>
                    setDraft({ ...draft, includeDetails })
                  }
                />
              }
            />
            <Notice tone="info" icon="information-outline">
              Enabling a threshold already reached sends one alert for the
              current cycle. Quiet-hour alerts that would arrive after that
              cycle’s reset are skipped.
            </Notice>
            <Button
              label="Save rule"
              loading={busy}
              onPress={() =>
                void run(async () => {
                  const db = await getAppDatabase();
                  const next = {
                    ...draft,
                    threshold:
                      draft.ruleType === 'threshold'
                        ? Number(value) / 100
                        : null,
                    leadMinutes:
                      draft.ruleType === 'reset-reminder'
                        ? Number(value)
                        : null,
                    quietHoursStart: quietStart.trim() || null,
                    quietHoursEnd: quietEnd.trim() || null,
                    updatedAt: new Date().toISOString(),
                  };
                  await saveUsageRule(db, next);
                  if (next.enabled) await requestNotificationPermission();
                  await refreshUsageNotifications(
                    db,
                    createExpoNotificationScheduler(),
                  );
                  setDraft(null);
                  setMessage('Rule saved. Scheduling status is shown above.');
                })
              }
            />
            <Button
              label="Cancel edit"
              variant="ghost"
              disabled={busy}
              onPress={() => setDraft(null)}
            />
          </Card>
        ) : null}
        <SectionTitle>Manual reset reminders</SectionTitle>
        {(['claude', 'codex'] as const).map((providerId) => (
          <Button
            key={providerId}
            label={`Add ${providerId} manual reset`}
            variant="secondary"
            disabled={busy}
            onPress={() => {
              const timestamp = new Date().toISOString();
              setManualEdit({
                id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                providerId,
                label: 'Manual reset',
                resetsAt: '',
                sourceNote: null,
                createdAt: timestamp,
                updatedAt: timestamp,
              });
              setTimezoneConfirmed(false);
              setDraft(null);
            }}
          />
        ))}
        {manual.map((entry) => (
          <Card key={entry.id}>
            <ListRow
              title={`${entry.providerId} · ${entry.label}`}
              subtitle={`${new Date(entry.resetsAt).toLocaleString()} · ${describeState(`reset-rule-${entry.id}`)}`}
            />
            <Button
              label="Edit time"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setManualEdit(entry);
                setTimezoneConfirmed(false);
                setDraft(null);
              }}
            />
            <Button
              label="Delete reminder"
              variant="ghost"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const db = await getAppDatabase();
                  await deleteManualResetReminder(
                    db,
                    createExpoNotificationScheduler(),
                    entry.id,
                  );
                  if (manualEdit?.id === entry.id) setManualEdit(null);
                })
              }
            />
          </Card>
        ))}
        {manualEdit ? (
          <Card>
            <Field
              label="Reminder label"
              value={manualEdit.label}
              onChange={(label) => setManualEdit({ ...manualEdit, label })}
            />
            <ListRow
              title={`Confirm device timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}
              trailing={
                <Switch
                  accessibilityLabel="Confirm device timezone"
                  value={timezoneConfirmed}
                  onValueChange={setTimezoneConfirmed}
                />
              }
            />
            <ManualResetForm
              key={manualEdit.id}
              initialValue={manualEdit.resetsAt}
              timezoneOffsetMinutes={
                timezoneConfirmed ? new Date().getTimezoneOffset() : null
              }
              now={new Date()}
              onSubmit={async (resetsAt) => {
                await requestNotificationPermission();
                const db = await getAppDatabase();
                await saveManualResetReminder(
                  db,
                  createExpoNotificationScheduler(),
                  {
                    entry: {
                      ...manualEdit,
                      resetsAt,
                      updatedAt: new Date().toISOString(),
                    },
                    now: new Date(),
                    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
                  },
                );
                setManualEdit(null);
                await load();
              }}
            />
            <Button
              label="Cancel edit"
              variant="ghost"
              onPress={() => setManualEdit(null)}
            />
          </Card>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

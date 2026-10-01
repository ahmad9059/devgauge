import { EarnedResetSection } from '@/features/connections/earned-reset-section';
import { useSyncStatus } from '@/features/dashboard/sync-provider';
import { getAppDatabase } from '@/services/app-database-store';
import { disconnectConnection } from '@/services/local-data';
import { createNotificationCanceller } from '@/services/notifications/canceller';
import { createExpoNotificationScheduler } from '@/services/notifications/expo-scheduler';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  ListRow,
  Notice,
  ProgressBar,
  Screen,
  ScreenScroll,
  SectionTitle,
  Sheet,
  Stack,
  StatusChip,
} from '@/components/ui';
import { Monogram } from '@/components/ui/monogram';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import {
  useProviderViews,
  useReloadProviders,
} from '@/features/dashboard/app-providers';
import { describeSource, describeState } from '@/domain/provider-status';
import type { UsageWindow as ProviderWindow } from '@/features/dashboard/provider-view-types';
import { formatRelativeMinutes } from '@/utils/format';

/** Splits windows into their shared-pool sections (Antigravity), else one list. */
function groupWindows(
  windows: ProviderWindow[],
): { group: string | undefined; windows: ProviderWindow[] }[] {
  const sections = new Map<
    string,
    { group: string | undefined; windows: ProviderWindow[] }
  >();
  for (const window of windows) {
    const key = window.group ?? '';
    const section = sections.get(key);
    if (section) section.windows.push(window);
    else sections.set(key, { group: window.group, windows: [window] });
  }
  return [...sections.values()];
}

export default function ProviderDetailScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { theme, typography } = useTheme();
  const router = useRouter();
  const reload = useReloadProviders();
  const { startSync, cancelProvider, syncingProviderIds, outcomes } =
    useSyncStatus();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [pendingDisconnectId, setPendingDisconnectId] = useState<string | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const providers = useProviderViews();
  const provider = providers.find((item) => item.id === providerId);

  if (!provider) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ErrorState
          title="Unknown provider"
          description="This provider is not part of the six supported integrations."
        />
      </Screen>
    );
  }

  const status = describeState(provider.state);
  const source = describeSource(provider.source);
  const relative = formatRelativeMinutes(provider.updatedMinutesAgo);
  const hasWindows = provider.windows.length > 0;
  const syncing = syncingProviderIds.includes(provider.id);
  const refresh = () => {
    setActionsOpen(false);
    setActionError(null);
    void startSync(provider.id, 'retry').catch(() =>
      setActionError('Could not refresh. Retry or reconnect this provider.'),
    );
  };
  const outcome = outcomes[provider.id];
  const outcomeMessage = syncing
    ? 'Refreshing usage…'
    : outcome?.status === 'rate-limited'
      ? `Refresh paused until ${new Date(outcome.retryAt).toLocaleString()}. Cached usage is shown.`
      : outcome?.status === 'transient-failure'
        ? 'Refresh failed. Cached usage is shown; retry when the cooldown ends.'
        : outcome?.status === 'auth-expired'
          ? 'Sign in again to refresh usage.'
          : outcome?.status === 'schema-changed'
            ? 'The provider response changed. Cached usage is shown.'
            : outcome?.status === 'cancelled'
              ? 'Refresh cancelled.'
              : outcome?.status === 'skipped'
                ? 'Refresh skipped because this connection is not currently eligible.'
                : outcome?.status === 'success'
                  ? 'Usage refreshed.'
                  : null;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header
          title={provider.displayName}
          subtitle={
            provider.planName ? `${provider.planName} · ${source}` : source
          }
          right={<Monogram label={provider.monogram} size={44} />}
        />

        <View style={styles.statusRow}>
          <StatusChip
            label={status.label}
            tone={status.tone}
            icon={status.icon}
          />
          {relative ? (
            <Text
              style={[
                typography.monoCaption,
                { color: theme.colors.textMuted },
              ]}
            >
              Updated {relative}
            </Text>
          ) : null}
        </View>

        {provider.state === 'error' ? (
          <ErrorState
            description={provider.note ?? 'The last refresh failed.'}
            onRetry={refresh}
          />
        ) : null}

        {actionError ? (
          <Notice tone="danger" icon="alert-outline">
            {actionError}
          </Notice>
        ) : null}
        {outcomeMessage ? (
          <Notice tone="info" icon="information-outline">
            {outcomeMessage}
          </Notice>
        ) : null}
        {hasWindows ? (
          groupWindows(provider.windows).map((section) => (
            <Card key={section.group ?? 'usage'}>
              <SectionTitle>{section.group ?? 'Usage windows'}</SectionTitle>
              {section.windows.map((window) => (
                <ProgressBar
                  key={`${window.group ?? ''}-${window.kind}-${window.label}`}
                  label={window.label}
                  percent={window.percent}
                  used={window.used}
                  limit={window.limit}
                  unit={window.unit}
                  resetsLabel={
                    window.resetDue
                      ? 'Reset due · awaiting fresh usage'
                      : window.resetsAt
                        ? new Date(window.resetsAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short',
                          })
                        : window.resetsText
                          ? `Resets ${window.resetsText} (time unverified)`
                          : null
                  }
                />
              ))}
            </Card>
          ))
        ) : (
          <EmptyState
            icon="chart-box-outline"
            title="No usage source yet"
            description={
              provider.note ??
              'This provider does not expose a supported usage source for DevGauge.'
            }
          />
        )}

        {provider.id === 'claude' || provider.id === 'codex' ? (
          <EarnedResetSection providerId={provider.id} />
        ) : null}
        <SectionTitle>Connection</SectionTitle>
        <Card padded={false}>
          <View style={styles.cardPad}>
            <ListRow
              title="Status"
              trailing={
                <Text
                  style={[
                    typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {status.label}
                </Text>
              }
            />
            <ListRow
              title="Source"
              trailing={
                <Text
                  style={[
                    typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {source}
                </Text>
              }
            />
            <ListRow
              title="Last updated"
              trailing={
                <Text
                  style={[
                    typography.label,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {relative ?? 'Never'}
                </Text>
              }
            />
          </View>
        </Card>

        <Stack gap="sm">
          <Button
            label="Card actions"
            variant="secondary"
            icon="dots-horizontal"
            onPress={() => setActionsOpen(true)}
          />
        </Stack>
      </ScreenScroll>

      <Sheet
        visible={actionsOpen}
        title={`${provider.displayName} actions`}
        onClose={() => setActionsOpen(false)}
      >
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          {status.hint}
        </Text>
        <Button
          label={syncing ? 'Refreshing…' : 'Refresh now'}
          loading={syncing}
          disabled={working || !provider.connectionId}
          onPress={refresh}
        />
        {syncing ? (
          <Button
            label="Cancel refresh"
            variant="ghost"
            onPress={() => cancelProvider(provider.id)}
          />
        ) : null}
        <Button
          label="Reauthorize"
          variant="secondary"
          disabled={working}
          onPress={() => {
            setActionsOpen(false);
            cancelProvider(provider.id);
            router.push({
              pathname: '/connect/[providerId]',
              params: { providerId: provider.id },
            });
          }}
        />
        <Button
          label="Disconnect"
          variant="danger"
          disabled={working || (!provider.connectionId && !pendingDisconnectId)}
          onPress={() => {
            setActionsOpen(false);
            setDisconnectOpen(true);
          }}
        />
      </Sheet>
      <Sheet
        visible={disconnectOpen}
        title="Disconnect provider"
        onClose={() => {
          if (!working) setDisconnectOpen(false);
        }}
      >
        <Notice tone="warning" icon="alert-outline">
          This removes this connection’s credential, cached history and local
          usage reminders. Your provider subscription stays active. Website
          sign-in may remain in the device’s browser; sign out on the provider’s
          site to remove it.
        </Notice>
        <Button
          label="Disconnect and delete local history"
          variant="danger"
          loading={working}
          onPress={async () => {
            const disconnectId = provider.connectionId ?? pendingDisconnectId;
            if (!disconnectId) return;
            setPendingDisconnectId(disconnectId);
            setWorking(true);
            setActionError(null);
            cancelProvider(provider.id);
            try {
              const db = await getAppDatabase();
              const store = createSecureStoreBackend();
              await disconnectConnection(
                db,
                {
                  vault: createSecureVault(store),
                  secretStore: store,
                  canceller: createNotificationCanceller(
                    db,
                    createExpoNotificationScheduler(),
                  ),
                },
                disconnectId,
                { deleteHistory: true, now: new Date().toISOString() },
              );
              setDisconnectOpen(false);
              setPendingDisconnectId(null);
              await reload();
            } catch {
              setDisconnectOpen(false);
              setActionError(
                'Disconnect cleanup is incomplete. Retry to remove remaining local credentials or reminders.',
              );
              await reload().catch(() => undefined);
            } finally {
              setWorking(false);
            }
          }}
        />
        <Button
          label="Cancel"
          variant="ghost"
          disabled={working}
          onPress={() => setDisconnectOpen(false)}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardPad: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});

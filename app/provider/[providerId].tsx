import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  CardDivider,
  EmptyState,
  ErrorState,
  Header,
  ListRow,
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
import { useProviderViews } from '@/features/dashboard/app-providers';
import { describeSource, describeState } from '@/domain/provider-status';
import { formatClockTime, formatRelativeMinutes } from '@/utils/format';

export default function ProviderDetailScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { theme, typography } = useTheme();
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
            onRetry={() => undefined}
          />
        ) : null}

        {hasWindows ? (
          <Card>
            <SectionTitle>Usage windows</SectionTitle>
            {provider.windows.map((window) => (
              <ProgressBar
                key={`${window.kind}-${window.label}`}
                label={window.label}
                percent={window.percent}
                used={window.used}
                limit={window.limit}
                unit={window.unit}
                resetsLabel={formatClockTime(
                  new Date(),
                  window.resetsInMinutes,
                )}
              />
            ))}
          </Card>
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
            <CardDivider />
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
            <CardDivider />
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
        <ListRow
          title="Refresh now"
          subtitle="Available once this connector is enabled"
          onPress={() => setActionsOpen(false)}
        />
        <ListRow
          title="Reauthorize"
          subtitle="Starts the provider sign-in flow"
          onPress={() => setActionsOpen(false)}
        />
        <ListRow
          title="Disconnect"
          destructive
          subtitle="Removes the stored session and local history"
          onPress={() => setActionsOpen(false)}
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

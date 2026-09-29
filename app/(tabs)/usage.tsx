import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProviderCard } from '@/components/usage/provider-card';
import {
  Button,
  EmptyState,
  Header,
  IconButton,
  Screen,
  ScreenScroll,
  Stack,
} from '@/components/ui';
import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { ProviderState } from '@/testing/fixtures/providers';
import { useProviderViews } from '@/features/dashboard/app-providers';
import { formatCountdown } from '@/utils/format';

// Usage shows only providers that actually have a connection or data.
const ACTIVE_STATES: ProviderState[] = [
  'connected',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];

export default function UsageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const allProviders = useProviderViews();
  const providers = allProviders.filter((provider) =>
    ACTIVE_STATES.includes(provider.state),
  );

  const summary = useMemo(() => {
    const nearLimit = providers.filter((provider) =>
      provider.windows.some((window) => (window.percent ?? 0) >= 80),
    );
    const resets = providers
      .flatMap((provider) =>
        provider.windows.map((window) => window.resetsInMinutes),
      )
      .filter((value): value is number => value !== undefined);
    const nextReset = resets.length > 0 ? Math.min(...resets) : undefined;
    const needsAttention = providers.filter(
      (provider) =>
        provider.state === 'stale' ||
        provider.state === 'auth-expired' ||
        provider.state === 'rate-limited' ||
        provider.state === 'error',
    );
    return { nearLimit, nextReset, needsAttention };
  }, [providers]);

  return (
    <Screen>
      <ScreenScroll>
        <Header
          title="Usage"
          subtitle="Connected providers"
          right={
            <IconButton
              icon="refresh"
              accessibilityLabel="Refresh all providers"
              onPress={() => router.push('/sync')}
            />
          }
        />

        {providers.length === 0 ? (
          <EmptyState
            icon="connection"
            title="No connectors yet"
            description="Add a provider to see its usage here."
            action={
              <Button
                label="Open connectors"
                icon="arrow-right"
                onPress={() => router.push('/(tabs)/connectors')}
              />
            }
          />
        ) : (
          <>
            <View
              style={[
                styles.summary,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <SummaryStat
                label="Near limit"
                value={
                  summary.nearLimit.length === 0
                    ? 'None'
                    : String(summary.nearLimit.length)
                }
              />
              <SummaryStat
                label="Next reset"
                value={formatCountdown(summary.nextReset) ?? '—'}
              />
              <SummaryStat
                label="Attention"
                value={
                  summary.needsAttention.length === 0
                    ? 'None'
                    : String(summary.needsAttention.length)
                }
              />
            </View>

            <Stack gap="md">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onPress={() =>
                    router.push({
                      pathname: '/provider/[providerId]',
                      params: { providerId: provider.id },
                    })
                  }
                />
              ))}
            </Stack>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.summaryStat}>
      <Text style={[typography.monoLabel, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  summaryStat: { flex: 1, gap: spacing.xxs },
});

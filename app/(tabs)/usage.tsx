import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProviderCard } from '@/components/usage/provider-card';
import {
  Header,
  IconButton,
  Notice,
  Screen,
  ScreenScroll,
  Stack,
} from '@/components/ui';
import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { useProviderViews } from '@/features/dashboard/app-providers';
import { formatCountdown } from '@/utils/format';

export default function UsageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const providerFixtures = useProviderViews();

  const summary = useMemo(() => {
    const nearLimit = providerFixtures.filter((provider) =>
      provider.windows.some((window) => (window.percent ?? 0) >= 80),
    );
    const resets = providerFixtures
      .flatMap((provider) =>
        provider.windows.map((window) => window.resetsInMinutes),
      )
      .filter((value): value is number => value !== undefined);
    const nextReset = resets.length > 0 ? Math.min(...resets) : undefined;
    const needsAttention = providerFixtures.filter(
      (provider) =>
        provider.state === 'stale' ||
        provider.state === 'auth-expired' ||
        provider.state === 'rate-limited' ||
        provider.state === 'error',
    );
    return { nearLimit, nextReset, needsAttention };
  }, [providerFixtures]);

  return (
    <Screen>
      <ScreenScroll>
        <Header
          title="Usage"
          subtitle="Local data · connectors are release-disabled until their gates pass"
          right={
            <IconButton
              icon="refresh"
              accessibilityLabel="Refresh all providers"
              onPress={() => undefined}
            />
          }
        />

        <Notice tone="info" icon="shield-lock-outline">
          Providers show their real release state from this device. No provider
          request is made until a connector passes its gate.
        </Notice>

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
            label="Needs attention"
            value={
              summary.needsAttention.length === 0
                ? 'None'
                : String(summary.needsAttention.length)
            }
          />
        </View>

        <Stack gap="lg">
          {providerFixtures.map((provider) => (
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

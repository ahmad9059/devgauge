import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DevGaugeLockup } from '@/components/brand/devgauge-lockup';
import { ProviderCard } from '@/components/usage/provider-card';
import { SyncControl } from '@/components/usage/sync-control';
import {
  Button,
  EmptyState,
  Screen,
  ScreenScroll,
  Stack,
} from '@/components/ui';
import type { ProviderState } from '@/features/dashboard/provider-view-types';
import { useProviderViews } from '@/features/dashboard/app-providers';

// Usage shows only providers that actually have a connection or data.
const ACTIVE_STATES: ProviderState[] = [
  'connected',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];

export default function UsageScreen() {
  const router = useRouter();
  const allProviders = useProviderViews();
  const providers = allProviders.filter((provider) =>
    ACTIVE_STATES.includes(provider.state),
  );

  return (
    <Screen>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <DevGaugeLockup />
          <View style={styles.actions}>
            <SyncControl />
          </View>
        </View>

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
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
});

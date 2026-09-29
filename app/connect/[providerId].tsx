import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ConnectorCard } from '@/components/connectors/connector-card';
import {
  Button,
  ErrorState,
  Header,
  ListRow,
  Notice,
  Screen,
  ScreenScroll,
  SectionTitle,
  Sheet,
  Stack,
} from '@/components/ui';
import { useTheme } from '@/design/theme-provider';
import { connectorMetadata } from '@/testing/fixtures/providers';
import { useProviderViews } from '@/features/dashboard/app-providers';
import { isSessionProvider } from '@/services/web-session/session-config';

export default function ConnectScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { theme, typography } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const metadata = connectorMetadata[provider.id];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title="Connect" subtitle={provider.displayName} />

        <ConnectorCard
          provider={provider}
          authMethod={metadata.authMethod}
          dataSummary={metadata.dataSummary}
          retention={metadata.retention}
          onSignIn={
            isSessionProvider(provider.id)
              ? () =>
                  router.push({
                    pathname: '/session/[providerId]',
                    params: { providerId: provider.id },
                  })
              : undefined
          }
          onConnect={
            isSessionProvider(provider.id)
              ? undefined
              : () => setSheetOpen(true)
          }
        />

        <Stack gap="sm">
          <Button
            label="Review permissions"
            variant="secondary"
            icon="shield-key-outline"
            onPress={() => setSheetOpen(true)}
          />
          <Button
            label="Back to connectors"
            variant="ghost"
            onPress={() => router.back()}
          />
        </Stack>
      </ScreenScroll>

      <Sheet
        visible={sheetOpen}
        title="What DevGauge would access"
        onClose={() => setSheetOpen(false)}
      >
        <ListRow title="Sign-in" subtitle={metadata.authMethod} />
        <ListRow title="Usage read" subtitle={metadata.dataSummary} />
        <ListRow title="Retention" subtitle={metadata.retention} />
        <ListRow
          title="Not collected"
          subtitle="Passwords, browser cookies, and provider secrets are never logged or stored."
        />
        <Notice tone="warning" icon="alert-outline">
          In-app sessions are experimental. DevGauge reads only the usage the
          provider page loads.
        </Notice>
        <Button
          label="Close"
          variant="ghost"
          onPress={() => setSheetOpen(false)}
        />
      </Sheet>
    </Screen>
  );
}

import { useRouter } from 'expo-router';

import { ConnectorCard } from '@/components/connectors/connector-card';
import { Header, Screen, ScreenScroll, Stack } from '@/components/ui';
import { useProviderViews } from '@/features/dashboard/app-providers';
import { isApiKeyProvider } from '@/providers/api-key/candidates';
import { isSessionProvider } from '@/services/web-session/session-config';
import { connectorMetadata } from '@/testing/fixtures/providers';

export default function ConnectorsScreen() {
  const router = useRouter();
  const providers = useProviderViews();

  return (
    <Screen>
      <ScreenScroll>
        <Header title="Connectors" subtitle="Connect a provider" />
        <Stack gap="md">
          {providers.map((provider) => {
            const metadata = connectorMetadata[provider.id];
            const session = isSessionProvider(provider.id);
            return (
              <ConnectorCard
                key={provider.id}
                provider={provider}
                authMethod={metadata.authMethod}
                dataSummary={metadata.dataSummary}
                retention={metadata.retention}
                onSignIn={
                  session
                    ? () =>
                        router.push({
                          pathname: '/session/[providerId]',
                          params: { providerId: provider.id },
                        })
                    : undefined
                }
                onOpenUsage={
                  session ? () => router.push('/(tabs)/usage') : undefined
                }
                onConnect={
                  session
                    ? undefined
                    : () =>
                        router.push(
                          isApiKeyProvider(provider.id)
                            ? {
                                pathname: '/apikey/[providerId]',
                                params: { providerId: provider.id },
                              }
                            : {
                                pathname: '/connect/[providerId]',
                                params: { providerId: provider.id },
                              },
                        )
                }
                onDisconnect={() => undefined}
              />
            );
          })}
        </Stack>
      </ScreenScroll>
    </Screen>
  );
}

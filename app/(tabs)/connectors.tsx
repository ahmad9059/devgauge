import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { ConnectorCard } from '@/components/connectors/connector-card';
import { Header, Notice, Screen, ScreenScroll, Stack } from '@/components/ui';
import {
  useProviderViews,
  useReloadProviders,
} from '@/features/dashboard/app-providers';
import { useSyncStatus } from '@/features/dashboard/sync-provider';
import { getAppDatabase } from '@/services/app-database-store';
import { disconnectConnection } from '@/services/local-data';
import { createNotificationCanceller } from '@/services/notifications/canceller';
import { createExpoNotificationScheduler } from '@/services/notifications/expo-scheduler';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';
import type { ProviderView } from '@/features/dashboard/provider-view-types';
import { isApiKeyProvider } from '@/providers/api-key/candidates';
import { isSessionProvider } from '@/services/web-session/session-config';
import { connectorMetadata } from '@/features/connections/connector-metadata';

export default function ConnectorsScreen() {
  const router = useRouter();
  const providers = useProviderViews();
  const reload = useReloadProviders();
  const { cancelProvider } = useSyncStatus();
  const pending = useRef(new Set<string>());
  const [disconnecting, setDisconnecting] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const disconnect = async (provider: ProviderView) => {
    if (!provider.connectionId || pending.current.has(provider.id)) return;
    pending.current.add(provider.id);
    setDisconnecting([...pending.current]);
    setActionError(null);
    try {
      cancelProvider(provider.id);
      const db = await getAppDatabase();
      const secretStore = createSecureStoreBackend();
      await disconnectConnection(
        db,
        {
          vault: createSecureVault(secretStore),
          secretStore,
          canceller: createNotificationCanceller(
            db,
            createExpoNotificationScheduler(),
          ),
        },
        provider.connectionId,
        { deleteHistory: false, now: new Date().toISOString() },
      );
    } catch {
      setActionError(
        `Could not finish disconnecting ${provider.displayName}. Please try again.`,
      );
    } finally {
      await reload().catch(() =>
        setActionError(
          'Could not reload connections. Reopen this screen to check the status.',
        ),
      );
      pending.current.delete(provider.id);
      setDisconnecting([...pending.current]);
    }
  };

  return (
    <Screen>
      <ScreenScroll>
        <Header title="Connectors" subtitle="Connect a provider" />
        {actionError ? (
          <Notice tone="danger" icon="alert-outline">
            {actionError}
          </Notice>
        ) : null}
        <Stack gap="md">
          {providers.map((provider) => {
            const metadata = connectorMetadata[provider.id];
            const session = isSessionProvider(provider.id);
            const google = provider.id === 'gemini-cli';
            const signIn = session
              ? {
                  pathname: '/session/[providerId]' as const,
                  params: { providerId: provider.id },
                }
              : google
                ? { pathname: '/antigravity' as const }
                : null;
            return (
              <ConnectorCard
                key={provider.id}
                provider={provider}
                authMethod={metadata.authMethod}
                dataSummary={metadata.dataSummary}
                retention={metadata.retention}
                onSignIn={
                  signIn
                    ? () => {
                        cancelProvider(provider.id);
                        router.push(signIn);
                      }
                    : undefined
                }
                onOpenUsage={() =>
                  router.push({
                    pathname: '/provider/[providerId]',
                    params: { providerId: provider.id },
                  })
                }
                onConnect={
                  signIn
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
                onDisconnect={() => {
                  void disconnect(provider);
                }}
                disconnecting={disconnecting.includes(provider.id)}
              />
            );
          })}
        </Stack>
      </ScreenScroll>
    </Screen>
  );
}

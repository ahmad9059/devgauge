import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import {
  Button,
  ErrorState,
  Header,
  Notice,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { ApiKeyForm } from '@/features/connections/api-key-form';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import { probeApiKey } from '@/providers/api-key/connect';
import {
  API_KEY_CANDIDATES,
  isApiKeyProvider,
} from '@/providers/api-key/candidates';
import { getAppDatabase } from '@/services/app-database-store';
import { createHttpClient } from '@/services/network/client';
import { saveSessionSnapshot } from '@/services/web-session/session';
import { buildCredentialRef, createSecureVault } from '@/storage/secure-vault';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';

/**
 * API-key connect for experimental providers. The key is validated against the
 * vendor usage endpoint, stored only in secure storage, and the returned usage
 * is persisted. Experimental: the endpoint is a candidate, not a confirmed
 * contract, so an unrecognized response is reported instead of faked.
 */
export default function ApiKeyScreen() {
  const params = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const reload = useReloadProviders();
  const abort = useRef(new AbortController());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const providerId = params.providerId;
  const candidate =
    typeof providerId === 'string' && isApiKeyProvider(providerId)
      ? API_KEY_CANDIDATES[providerId]
      : undefined;

  if (!candidate || !providerId || !isApiKeyProvider(providerId)) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ErrorState
          title="No API key flow"
          description="This provider does not use an API key."
        />
      </Screen>
    );
  }

  const connect = async (apiKey: string) => {
    const startedAt = new Date();
    setBusy(true);
    setError(null);
    try {
      const client = createHttpClient();
      const probe = await probeApiKey(
        client,
        providerId,
        apiKey,
        abort.current.signal,
      );
      if (!probe.ok) {
        setError(probe.reason);
        return;
      }
      const db = await getAppDatabase();
      const secretStore = createSecureStoreBackend();
      const vault = createSecureVault(secretStore);
      const connectionId = `apikey-${providerId}`;
      const credentialRef = buildCredentialRef(
        providerId,
        connectionId,
        'api-key',
      );
      await vault.save(credentialRef, { version: 1, kind: 'api-key', apiKey });
      let ids = 0;
      await saveSessionSnapshot({
        db,
        providerId,
        displayName: `${candidate.host} API key`,
        windows: probe.windows,
        startedAt,
        fetchedAt: new Date().toISOString(),
        now: new Date(),
        nextId: () => `${connectionId}-${Date.now()}-${(ids += 1)}`,
        authMode: 'api-key',
        credentialRef,
      });
      await reload();
      router.replace('/(tabs)/usage');
    } catch {
      setError('Could not save the connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title="API key" subtitle={providerId} />
        <Notice tone="info" icon="information-outline">
          The key is stored in secure storage and used only to read usage. The
          vendor endpoint is a candidate, so an unrecognized response is shown
          instead of guessed.
        </Notice>
        {error ? (
          <Notice tone="danger" icon="alert-outline">
            {error}
          </Notice>
        ) : null}
        <ApiKeyForm
          onSubmit={connect}
          submitLabel={busy ? 'Checking…' : 'Connect'}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScreenScroll>
    </Screen>
  );
}

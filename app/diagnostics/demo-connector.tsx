import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  Button,
  Card,
  Header,
  Notice,
  Screen,
  ScreenScroll,
  Stack,
} from '@/components/ui';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import { useTheme } from '@/design/theme-provider';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import { createRefreshEngine } from '@/features/dashboard/refresh-connection';
import { createMockProviderAdapter } from '@/providers/mock/adapter';
import { successFixture } from '@/providers/mock/fixtures';
import { createProviderRegistry } from '@/providers/registry';
import { getAppDatabase } from '@/services/app-database-store';
import {
  createHttpClient,
  type FetchResponseLike,
} from '@/services/network/client';
import {
  deleteConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';

// Dev/preview only. A clearly labeled demo connection lets the real pipeline
// (HTTP client -> schema -> normalize -> refresh engine -> encrypted SQLite ->
// dashboard) run end to end without a vendor contract. It never touches a real
// provider and is removed with one tap.
const DEMO_CONNECTION_ID = 'demo-claude';

function jsonResponse(body: string): FetchResponseLike {
  return {
    status: 200,
    headers: { get: () => null, forEach: () => undefined },
    text: async () => body,
  };
}

function DemoConnector() {
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const [status, setStatus] = useState('Not connected.');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      const db = await getAppDatabase();
      const now = new Date().toISOString();
      await upsertConnection(db, {
        id: DEMO_CONNECTION_ID,
        providerId: 'claude',
        accountScope: 'personal',
        externalAccountId: null,
        canonicalAccountKey: `demo:${DEMO_CONNECTION_ID}`,
        displayName: 'Demo · sample data',
        accountHint: null,
        authMode: 'api-key',
        credentialRef: null,
        status: 'connected',
        connectedAt: now,
        disconnectedAt: null,
        lastSuccessAt: null,
        lastAttemptAt: null,
        nextAllowedRefreshAt: null,
        createdAt: now,
        updatedAt: now,
      });

      let ids = 0;
      const engine = createRefreshEngine({
        db,
        vault: createSecureVault(createSecureStoreBackend()),
        registry: createProviderRegistry({
          claude: createMockProviderAdapter({ id: 'claude' }),
        }),
        client: createHttpClient({
          fetchImpl: async () => jsonResponse(successFixture()),
        }),
        nextId: () => `${DEMO_CONNECTION_ID}-${(ids += 1)}`,
        clock: () => new Date(),
      });
      const outcome = await engine.refresh(DEMO_CONNECTION_ID, 'manual');
      await reload();
      setStatus(`Refresh outcome: ${outcome.status}. Open Usage to see it.`);
    } catch (error) {
      setStatus(`Failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const db = await getAppDatabase();
      await deleteConnection(db, DEMO_CONNECTION_ID);
      await reload();
      setStatus('Demo data removed.');
    } catch (error) {
      setStatus(`Failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title="Demo connector" subtitle="Internal test build only" />
        <Notice tone="warning" icon="flask-outline">
          Runs the real pipeline with sanitized sample data and writes to the
          encrypted database. It contacts no real provider and appears as Demo ·
          sample data in the dashboard.
        </Notice>
        <Stack gap="sm">
          <Button
            label={busy ? 'Working…' : 'Connect demo (sample data)'}
            icon="link-variant"
            disabled={busy}
            onPress={connect}
          />
          <Button
            label="Remove demo data"
            variant="secondary"
            icon="delete-outline"
            disabled={busy}
            onPress={remove}
          />
        </Stack>
        <Card>
          <Text
            style={[
              typography.monoLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            {status}
          </Text>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}

export default function DemoConnectorRoute() {
  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;
  return <DemoConnector />;
}

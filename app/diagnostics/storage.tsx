import { getRandomBytesAsync } from 'expo-crypto';
import { Redirect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { createRefreshEngine } from '@/features/dashboard/refresh-connection';
import { createMockProviderAdapter } from '@/providers/mock/adapter';
import { successFixture } from '@/providers/mock/fixtures';
import { createProviderRegistry } from '@/providers/registry';
import {
  createHttpClient,
  type FetchResponseLike,
} from '@/services/network/client';
import { openAppDatabase } from '@/storage/app-database';
import {
  getOrCreateDatabaseKey,
  pragmaKeyStatement,
} from '@/storage/database-key';
import {
  deleteConnection,
  upsertConnection,
} from '@/storage/repositories/connections';
import { latestByConnection, saveRefresh } from '@/storage/repositories/usage';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';

type Result = {
  label: string;
  status: 'pass' | 'fail';
  detail: string;
};

const PROBE_DB = 'devgauge.selftest.probe.db';

function pass(label: string, detail: string): Result {
  return { label, status: 'pass', detail };
}
function fail(label: string, detail: string): Result {
  return { label, status: 'fail', detail };
}

function jsonResponse(body: string): FetchResponseLike {
  return {
    status: 200,
    headers: { get: () => null, forEach: () => undefined },
    text: async () => body,
  };
}

async function runSelfTest(): Promise<Result[]> {
  const results: Result[] = [];
  const backend = createSecureStoreBackend();
  const key = await getOrCreateDatabaseKey(backend, getRandomBytesAsync);

  const startedAt = Date.now();
  const db = await openAppDatabase();
  const openMs = Date.now() - startedAt;
  const userVersion = await db.userVersion();
  const pageCount = await db.first<{ page_count: number }>('PRAGMA page_count');
  const pageSize = await db.first<{ page_size: number }>('PRAGMA page_size');
  const bytes = (pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 0);
  results.push(
    pass(
      'Open encrypted DB + migrate',
      `user_version ${userVersion} · ${openMs} ms · ${Math.round(bytes / 1024)} KB`,
    ),
  );

  const cipher = await db.first<{ cipher_version: string }>(
    'PRAGMA cipher_version',
  );
  results.push(
    cipher?.cipher_version
      ? pass('SQLCipher compiled in', cipher.cipher_version)
      : fail('SQLCipher compiled in', 'PRAGMA cipher_version returned nothing'),
  );

  try {
    const id = `selftest-${Date.now()}`;
    const now = new Date().toISOString();
    await upsertConnection(db, {
      id,
      providerId: 'claude',
      accountScope: 'personal',
      externalAccountId: null,
      canonicalAccountKey: `selftest:${id}`,
      displayName: 'Self-test',
      accountHint: null,
      authMode: 'manual',
      credentialRef: null,
      status: 'connected',
      connectedAt: now,
      disconnectedAt: null,
      lastSuccessAt: now,
      lastAttemptAt: now,
      nextAllowedRefreshAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await saveRefresh(db, {
      connection: {
        id,
        status: 'connected',
        lastSuccessAt: now,
        lastAttemptAt: now,
        nextAllowedRefreshAt: null,
        updatedAt: now,
      },
      attempt: {
        id: `${id}-attempt`,
        connectionId: id,
        startedAt: now,
        completedAt: now,
        trigger: 'manual',
        outcome: 'success',
        httpStatus: 200,
        errorCode: null,
        retryAfterAt: null,
        requestId: null,
        durationMs: 1,
        safeDetail: null,
      },
      snapshot: {
        snapshot: {
          id: `${id}-snap`,
          connectionId: id,
          fetchedAt: now,
          source: 'live',
          providerSchemaVersion: 1,
          isPartial: false,
          responseFingerprint: null,
          createdAt: now,
        },
        windows: [
          {
            id: `${id}-win`,
            snapshotId: `${id}-snap`,
            externalKey: 'five-hour',
            kind: 'rolling',
            label: '5-hour window',
            usedDecimal: '42',
            limitDecimal: '100',
            remainingDecimal: '58',
            utilization: 0.42,
            unit: 'percent',
            currencyCode: null,
            periodStartsAt: null,
            periodEndsAt: null,
            resetsAt: null,
            derivation: 'provider',
          },
        ],
      },
    });
    const latest = await latestByConnection(db);
    const wrote = latest.get(id)?.windows.length === 1;
    await deleteConnection(db, id);
    results.push(
      wrote
        ? pass(
            'Repository write/read/delete',
            'snapshot with 1 window round-tripped',
          )
        : fail('Repository write/read/delete', 'snapshot missing after write'),
    );
  } catch (error) {
    results.push(fail('Repository write/read/delete', String(error)));
  }

  // Prove a real adapter runs end-to-end: fetch -> validate -> normalize ->
  // engine -> encrypted persistence. The mock adapter stands in for a connector
  // until a provider passes its gate; the connection is removed afterwards.
  try {
    const id = `selftest-adapter-${Date.now()}`;
    const now = new Date().toISOString();
    await upsertConnection(db, {
      id,
      providerId: 'claude',
      accountScope: 'personal',
      externalAccountId: null,
      canonicalAccountKey: `selftest-adapter:${id}`,
      displayName: 'Adapter self-test',
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
    const registry = createProviderRegistry({
      claude: createMockProviderAdapter({ id: 'claude' }),
    });
    let ids = 0;
    const engine = createRefreshEngine({
      db,
      vault: createSecureVault(createSecureStoreBackend()),
      registry,
      client: createHttpClient({
        fetchImpl: async () => jsonResponse(successFixture()),
      }),
      nextId: () => `${id}-${(ids += 1)}`,
      clock: () => new Date(),
    });
    const outcome = await engine.refresh(id, 'manual');
    const persisted = (await latestByConnection(db)).get(id);
    await deleteConnection(db, id);
    results.push(
      outcome.status === 'success' && (persisted?.windows.length ?? 0) === 2
        ? pass(
            'Adapter pipeline (mock)',
            `fetch -> engine -> encrypted DB persisted ${persisted?.windows.length} windows`,
          )
        : fail(
            'Adapter pipeline (mock)',
            `outcome=${outcome.status} windows=${persisted?.windows.length ?? 0}`,
          ),
    );
  } catch (error) {
    results.push(fail('Adapter pipeline (mock)', String(error)));
  }

  await db.close();

  // Encrypt a throwaway database, then prove it cannot be read without the key.
  try {
    await SQLite.deleteDatabaseAsync(PROBE_DB).catch(() => undefined);
    const keyed = await SQLite.openDatabaseAsync(PROBE_DB);
    await keyed.execAsync(pragmaKeyStatement(key));
    await keyed.execAsync(
      "CREATE TABLE probe (id TEXT); INSERT INTO probe VALUES ('secret-row');",
    );
    await keyed.closeAsync();

    let blocked = false;
    let detail = '';
    try {
      const plain = await SQLite.openDatabaseAsync(PROBE_DB);
      await plain.getFirstAsync('SELECT id FROM probe');
      await plain.closeAsync();
    } catch (error) {
      blocked = true;
      detail = String(error).slice(0, 120);
    }
    await SQLite.deleteDatabaseAsync(PROBE_DB).catch(() => undefined);
    results.push(
      blocked
        ? pass('Keyless open is rejected', detail || 'query failed as expected')
        : fail('Keyless open is rejected', 'database opened without its key'),
    );
  } catch (error) {
    results.push(fail('Keyless open is rejected', String(error)));
  }

  return results;
}

function StorageSelfTest() {
  const { theme, typography } = useTheme();
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setResults([]);
    try {
      setResults(await runSelfTest());
    } catch (error) {
      setResults([fail('Self-test crashed', String(error))]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header
          title="Local storage self-test"
          subtitle="Internal test build only"
        />
        <Notice tone="warning" icon="database-lock-outline">
          Runs against the encrypted database and a temporary probe database. No
          credentials are read or written.
        </Notice>
        <Button
          label={running ? 'Running…' : 'Run self-test'}
          icon="database-sync-outline"
          disabled={running}
          onPress={run}
        />
        <Stack gap="sm">
          {results.map((result) => (
            <Card key={result.label}>
              <View style={styles.row}>
                <Text
                  style={[
                    typography.bodyStrong,
                    {
                      color:
                        result.status === 'pass'
                          ? theme.colors.positive
                          : theme.colors.danger,
                    },
                  ]}
                >
                  {result.status === 'pass' ? 'PASS' : 'FAIL'}
                </Text>
                <Text
                  style={[
                    typography.labelStrong,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {result.label}
                </Text>
              </View>
              <Text
                style={[
                  typography.monoCaption,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {result.detail}
              </Text>
            </Card>
          ))}
        </Stack>
      </ScreenScroll>
    </Screen>
  );
}

export default function StorageSelfTestRoute() {
  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;
  return <StorageSelfTest />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

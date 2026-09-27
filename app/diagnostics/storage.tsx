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

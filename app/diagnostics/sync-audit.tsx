import { useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { requireNativeModule } from 'expo';
import { fetchHeadlessSession } from '@/services/web-session/headless-session';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import { getAppDatabase } from '@/services/app-database-store';
import { useSyncStatus } from '@/features/dashboard/sync-provider';
import { isSessionProvider } from '@/services/web-session/session-config';
import { Screen, ScreenScroll } from '@/components/ui';

/** Temporary device-test audit: reads only non-secret usage and attempt metadata. */
export default function SyncAudit() {
  const { action, provider, nonce } = useLocalSearchParams<{action?: string; provider?: string; nonce?: string}>();
  const {startSync} = useSyncStatus();
  const [summary, setSummary] = useState('Reading sync audit…');
  useEffect(() => {
    if (!diagnosticsEnabled) return;
    void (async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (action === 'headless' && isSessionProvider(provider ?? '')) console.info('DG_HEADLESS_TEST', await fetchHeadlessSession(provider as Parameters<typeof fetchHeadlessSession>[0], new AbortController().signal));
      if (action === 'worker') console.info('DG_TEST_WORKER', await requireNativeModule('DevGaugeSession').testBackgroundWorker());
      if (action === 'sync' && (provider === 'gemini-cli' || isSessionProvider(provider ?? ''))) await startSync(provider as Parameters<typeof startSync>[0]);
      const db = await getAppDatabase();
      const audit = {
        nonce, generatedAt: new Date().toISOString(), appState: AppState.currentState,
        tasks: await TaskManager.getRegisteredTasksAsync(),
        connections: await db.all('SELECT id, provider_id, status, last_success_at, last_attempt_at, next_allowed_refresh_at FROM provider_connections'),
        snapshots: await db.all('SELECT connection_id, COUNT(*) AS count, MAX(fetched_at) AS latest FROM usage_snapshots GROUP BY connection_id'),
        attempts: await db.all<Record<string, unknown>>('SELECT connection_id, started_at, completed_at, trigger, outcome, error_code, duration_ms FROM refresh_attempts ORDER BY started_at DESC LIMIT 120'),
      };
      console.info('DG_SYNC_AUDIT', JSON.stringify({...audit, attempts: undefined}));
      for (const attempt of audit.attempts) console.info('DG_SYNC_ATTEMPT', JSON.stringify({nonce, ...attempt}));
      setSummary(JSON.stringify(audit, null, 2));
    })().catch(error => {console.info('DG_SYNC_AUDIT_ERROR', String(error)); setSummary(String(error));});
  }, [action, provider, nonce, startSync]);
  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;
  return <Screen><ScreenScroll><Text>{summary}</Text></ScreenScroll></Screen>;
}

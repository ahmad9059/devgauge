import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Crypto from 'expo-crypto';
import { AppState, Platform } from 'react-native';
import { getAppDatabase } from './app-database-store';
import {
  createRefreshEngine,
  type RefreshEngine,
} from '@/features/dashboard/refresh-connection';
import {
  createProviderRegistry,
  supportsMountedUsage,
} from '@/providers/registry';
import { listConnections } from '@/storage/repositories/connections';
import { createSecureVault } from '@/storage/secure-vault';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createHttpClient } from './network/client';
import { fetchAntigravityUsage } from '@/providers/antigravity/sync';
import { fetchHeadlessSession } from './web-session/headless-session';
import { isSessionProvider } from './web-session/session-config';
import { ProviderError } from '@/domain/errors';
import { refreshUsageNotifications } from './notifications/usage-notifications';
import { createExpoNotificationScheduler } from './notifications/expo-scheduler';
import { scheduleHistoryMaintenance } from './history-maintenance';

export const BACKGROUND_REFRESH_TASK = 'devgauge-six-hour-refresh';
export const BACKGROUND_REFRESH_MINUTES = 360;
let backgroundEngine: RefreshEngine | null = null;
let backgroundDone: Promise<void> = Promise.resolve();
function isForeground() {
  return AppState.currentState === 'active';
}

/** Foreground capture waits until the worker releases its DB and renderers. */
export async function drainBackgroundRefresh() {
  await backgroundEngine?.cancelAllAndWait();
  await backgroundDone;
}

TaskManager.defineTask(BACKGROUND_REFRESH_TASK, async () => {
  // Foreground owns its mounted renderers; Android's worker runs headlessly.
  if (isForeground()) return BackgroundTask.BackgroundTaskResult.Success;
  let finish!: () => void;
  backgroundDone = new Promise<void>((resolve) => {
    finish = resolve;
  });
  try {
    const db = await getAppDatabase();
    const vault = createSecureVault(createSecureStoreBackend());
    const connections = (await listConnections(db)).filter(
      (connection) =>
        connection.status !== 'disconnected' &&
        supportsMountedUsage(connection),
    );
    const engine = createRefreshEngine({
      db,
      vault,
      registry: createProviderRegistry(),
      client: createHttpClient(),
      nextId: () => Crypto.randomUUID(),
      concurrency: 2,
      deadlineMs: 40000,
      maxRetries: 3,
      transport: {
        supports: supportsMountedUsage,
        async fetchUsage({ connection, signal }) {
          if (connection.providerId === 'gemini-cli')
            return fetchAntigravityUsage({
              db,
              vault,
              nextId: () => Crypto.randomUUID(),
              fetchImpl: (url, init) => fetch(url, { ...init, signal }),
            });
          if (isSessionProvider(connection.providerId))
            return fetchHeadlessSession(connection.providerId, signal);
          throw new ProviderError(
            'unsupported_account',
            'Background transport unavailable',
          );
        },
      },
    });
    backgroundEngine = engine;
    if (isForeground()) return BackgroundTask.BackgroundTaskResult.Success;
    const outcomes = await engine.refreshMany(
      connections.map((connection) => connection.id),
      'retry',
    );
    scheduleHistoryMaintenance(db);
    await refreshUsageNotifications(db, createExpoNotificationScheduler());
    return outcomes.some((outcome) => outcome.status === 'transient-failure')
      ? BackgroundTask.BackgroundTaskResult.Failed
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  } finally {
    backgroundEngine = null;
    finish();
  }
});

export async function registerBackgroundRefresh() {
  if (Platform.OS !== 'android') return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_REFRESH_TASK, {
    minimumInterval: BACKGROUND_REFRESH_MINUTES,
  });
}

import {
  supportsMountedUsage,
  createProviderRegistry,
} from '@/providers/registry';
import { refreshUsageNotifications } from '@/services/notifications/usage-notifications';
import { createExpoNotificationScheduler } from '@/services/notifications/expo-scheduler';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import * as Crypto from 'expo-crypto';
import type { UsageWindow } from '@/domain/usage';
import type { ProviderId } from '@/domain/providers';
import { fetchAntigravityUsage } from '@/providers/antigravity/sync';
import { scheduleHistoryMaintenance } from '@/services/history-maintenance';
import { getAppDatabase } from '@/services/app-database-store';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';
import {
  createSyncBridgeScript,
  refreshSessionScript,
} from '@/services/web-session/bridge-script';
import {
  allowedSessionHost,
  isSessionProvider,
  SESSION_PROVIDERS,
  SESSION_USER_AGENT,
  type SessionProviderId,
} from '@/services/web-session/session-config';
import { createHttpClient } from '@/services/network/client';
import { ProviderError } from '@/domain/errors';
import { parseRetryAfter } from '@/services/network/backoff';
import type { NormalizedUsageResult } from '@/providers/types';
import type { RefreshTrigger } from '@/storage/types';
import { listConnections } from '@/storage/repositories/connections';
import {
  createRefreshEngine,
  type RefreshEngine,
  type RefreshOutcome,
} from './refresh-connection';
import {
  extractRawWindows,
  toDomainWindows,
  type CapturedResponse,
} from '@/services/web-session/usage-extract';
import {
  isQuotaReady,
  needsResetTiming,
  needsWorkspaceCapture,
} from '@/services/web-session/quota-readiness';
import { parseUsageText } from '@/services/web-session/usage-text';
import type {
  ProviderView,
  ProviderState,
} from '@/features/dashboard/provider-view-types';

import { useProviderViews, useReloadProviders } from './app-providers';

const SYNCABLE: ProviderState[] = [
  'connected',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];
const PER_PROVIDER_TIMEOUT_MS = 12_000;
const FAST_REFRESH_TIMEOUT_MS = 2500;

type SyncStatus = {
  isSyncing: boolean;
  /** Completion order lets the status control acknowledge fast providers first. */
  completedProviderIds: ProviderId[];
  syncingProviderIds: ProviderId[];
  displayedProviderId: ProviderId | null;
  outcomes: Partial<Record<ProviderId, RefreshOutcome>>;
};

type SyncContextValue = SyncStatus & {
  startSync: (
    providerId?: ProviderId,
    trigger?: RefreshTrigger,
  ) => Promise<void>;
  cancelProvider: (providerId: ProviderId) => void;
  resetSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

type WebJob = {
  runId: number;
  mode: 'api' | 'page';
  capturedAt: Date;
  provider: ProviderView;
  captured: CapturedResponse[];
  text: string;
  partialWindows?: UsageWindow[];
  done: boolean;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (result: NormalizedUsageResult) => void;
  reject: (error: unknown) => void;
  cleanup: () => void;
};

type WebHost = { provider: ProviderView; runId: number; epoch: number };
const SESSION_SOURCES = Object.fromEntries(
  Object.entries(SESSION_PROVIDERS).map(([id, config]) => [
    id,
    { uri: config.usageUrl },
  ]),
);

function fetchWithSignal(signal: AbortSignal) {
  return async (url: string, init: RequestInit): Promise<Response> => {
    try {
      const response = await fetch(url, { ...init, signal });
      if (response.status === 429) {
        const retry = parseRetryAfter(
          response.headers.get('retry-after'),
          new Date(),
        );
        throw new ProviderError('rate_limited', 'Provider cooldown', {
          httpStatus: 429,
          retryAfterMs: retry
            ? Math.max(0, retry.getTime() - Date.now())
            : 60_000,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof ProviderError || signal.aborted) throw error;
      throw new ProviderError('offline', 'Could not reach provider');
    }
  };
}

/**
 * Owns background refresh work for both the manual button and app-open sync.
 * Website providers use their persisted WebView cookies in a 1dp host; quota
 * snapshots reload immediately after each provider completes.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const providers = useProviderViews();
  const reload = useReloadProviders();
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    completedProviderIds: [],
    syncingProviderIds: [],
    displayedProviderId: null,
    outcomes: {},
  });
  const [webHosts, setWebHosts] = useState<WebHost[]>([]);
  const webRefs = useRef(new Map<ProviderId, WebView>());
  const jobsRef = useRef(new Map<ProviderId, WebJob>());
  const nextRunId = useRef(0);
  const providersRef = useRef(providers);
  useEffect(() => {
    providersRef.current = providers;
  }, [providers]);
  const engineRef = useRef<Promise<RefreshEngine> | null>(null);
  const activeRef = useRef(true);
  const autoStartedRef = useRef(false);

  const finishWebJob = useCallback(
    (
      providerId: ProviderId,
      runId: number,
      windows?: UsageWindow[],
      failure: ProviderError = new ProviderError(
        'timeout',
        'Usage capture timed out',
      ),
    ) => {
      const job = jobsRef.current.get(providerId);
      if (!job || job.done || job.runId !== runId) return;
      job.done = true;
      clearTimeout(job.timeout);
      job.cleanup();
      jobsRef.current.delete(providerId);
      webRefs.current
        .get(providerId)
        ?.injectJavaScript(
          `if (window.__devgaugeRunId === ${runId}) window.__devgaugeStopCapture && window.__devgaugeStopCapture(); true;`,
        );
      if (windows?.length)
        job.resolve({
          windows,
          fetchedAt: new Date().toISOString(),
          schemaVersion: 1,
          isPartial: windows.some((window) => !window.resetsAt),
        });
      else job.reject(failure);
    },
    [],
  );

  const loadFullPage = useCallback(
    (providerId: ProviderId, runId: number) => {
      const job = jobsRef.current.get(providerId);
      if (!job || job.runId !== runId || job.done || job.mode === 'page')
        return;
      clearTimeout(job.timeout);
      job.mode = 'page';
      job.captured = [];
      job.text = '';
      job.timeout = setTimeout(
        () => void finishWebJob(providerId, runId, job.partialWindows),
        PER_PROVIDER_TIMEOUT_MS,
      );
      // A fresh renderer also guarantees the fallback bridge gets the current
      // attempt ID even if Android has not applied updated injection props yet.
      setWebHosts((hosts) =>
        hosts.map((host) =>
          host.provider.id === providerId ? { ...host, epoch: runId } : host,
        ),
      );
    },
    [finishWebJob],
  );

  const syncWebProvider = useCallback(
    (provider: ProviderView, signal: AbortSignal) =>
      new Promise<NormalizedUsageResult>((resolve, reject) => {
        if (signal.aborted) {
          reject(new ProviderError('unknown', 'Cancelled'));
          return;
        }
        const runId = ++nextRunId.current;
        const webView = webRefs.current.get(provider.id);
        const timeout = setTimeout(
          () =>
            webView
              ? loadFullPage(provider.id, runId)
              : void finishWebJob(
                  provider.id,
                  runId,
                  jobsRef.current.get(provider.id)?.partialWindows,
                ),
          webView ? FAST_REFRESH_TIMEOUT_MS : PER_PROVIDER_TIMEOUT_MS,
        );
        jobsRef.current.set(provider.id, {
          runId,
          capturedAt: new Date(),
          mode: webView ? 'api' : 'page',
          provider,
          captured: [],
          text: '',
          done: false,
          timeout,
          resolve,
          reject,
          cleanup: () => signal.removeEventListener('abort', abort),
        });
        const abort = () =>
          finishWebJob(
            provider.id,
            runId,
            undefined,
            new ProviderError('unknown', 'Cancelled'),
          );
        signal.addEventListener('abort', abort, { once: true });
        setWebHosts((current) => {
          const existing = current.find(
            (host) => host.provider.id === provider.id,
          );
          const host = { provider, runId, epoch: existing?.epoch ?? runId };
          return existing
            ? current.map((item) =>
                item.provider.id === provider.id ? host : item,
              )
            : [
                ...current.filter((item) =>
                  jobsRef.current.has(item.provider.id),
                ),
                host,
              ].slice(-2);
        });
        if (webView) webView.injectJavaScript(refreshSessionScript(runId));
      }),
    [finishWebJob, loadFullPage],
  );

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = getAppDatabase()
        .then((db) =>
          createRefreshEngine({
            db,
            registry: createProviderRegistry(),
            client: createHttpClient(),
            vault: createSecureVault(createSecureStoreBackend()),
            nextId: () => Crypto.randomUUID(),
            concurrency: 2,
            deadlineMs: 15_000,
            transport: {
              supports: (connection) => supportsMountedUsage(connection),
              async fetchUsage({ connection, signal }) {
                if (connection.providerId === 'gemini-cli')
                  return fetchAntigravityUsage({
                    db,
                    vault: createSecureVault(createSecureStoreBackend()),
                    fetchImpl: fetchWithSignal(signal),
                    nextId: () => Crypto.randomUUID(),
                  });
                const provider = providersRef.current.find(
                  (item) => item.id === connection.providerId,
                );
                if (!provider)
                  throw new ProviderError(
                    'unsupported_account',
                    'Connection no longer available',
                  );
                return syncWebProvider(provider, signal);
              },
            },
          }),
        )
        .catch((error) => {
          engineRef.current = null;
          throw error;
        });
    }
    return engineRef.current;
  }, [syncWebProvider]);

  const startSync = useCallback(
    async (providerId?: ProviderId, trigger: RefreshTrigger = 'manual') => {
      const db = await getAppDatabase();
      const connections = (await listConnections(db)).filter(
        (connection) =>
          connection.status !== 'disconnected' &&
          (!providerId || connection.providerId === providerId) &&
          supportsMountedUsage(connection),
      );
      if (!activeRef.current || !connections.length) return;
      const engine = await getEngine();
      if (!activeRef.current) {
        engine.cancelAll();
        return;
      }
      setStatus((current) => ({
        ...current,
        isSyncing: true,
        completedProviderIds: [],
        syncingProviderIds: [
          ...new Set([
            ...current.syncingProviderIds,
            ...connections.map((connection) => connection.providerId),
          ]),
        ],
        displayedProviderId: connections[0].providerId,
      }));
      await Promise.all(
        connections.map(async (connection) => {
          let outcome: RefreshOutcome;
          try {
            outcome = await engine.refresh(connection.id, trigger);
          } catch {
            outcome = {
              status: 'transient-failure',
              connectionId: connection.id,
              code: 'unknown',
              retryAt: null,
            };
          }
          await reload().catch(() => undefined);
          if (outcome.status === 'success') {
            scheduleHistoryMaintenance(db);
            void refreshUsageNotifications(
              db,
              createExpoNotificationScheduler(),
            ).catch(() => undefined);
          }
          if (!activeRef.current) return;
          setStatus((current) => {
            const remaining = current.syncingProviderIds.filter(
              (id) => id !== connection.providerId,
            );
            return {
              ...current,
              isSyncing: remaining.length > 0,
              syncingProviderIds: remaining,
              displayedProviderId: remaining[0] ?? null,
              completedProviderIds:
                outcome.status === 'success'
                  ? [
                      ...new Set([
                        ...current.completedProviderIds,
                        connection.providerId,
                      ]),
                    ]
                  : current.completedProviderIds,
              outcomes: {
                ...current.outcomes,
                [connection.providerId]: outcome,
              },
            };
          });
        }),
      );
    },
    [getEngine, reload],
  );

  const cancelProvider = useCallback(
    (providerId: ProviderId) => {
      void engineRef.current?.then((engine) => {
        const provider = providersRef.current.find(
          (item) => item.id === providerId,
        );
        if (provider?.connectionId) engine.cancel(provider.connectionId);
      });
      const job = jobsRef.current.get(providerId);
      if (job)
        finishWebJob(
          providerId,
          job.runId,
          undefined,
          new ProviderError('unknown', 'Cancelled'),
        );
      webRefs.current.delete(providerId);
      setWebHosts((hosts) =>
        hosts.filter((host) => host.provider.id !== providerId),
      );
    },
    [finishWebJob],
  );

  const resetSync = useCallback(async () => {
    const engine = await engineRef.current;
    engineRef.current = null;
    await engine?.cancelAllAndWait();
    webRefs.current.clear();
    setWebHosts([]);
  }, []);

  useEffect(() => {
    if (
      autoStartedRef.current ||
      !providers.some((provider) => SYNCABLE.includes(provider.state))
    )
      return;
    autoStartedRef.current = true;
    void startSync(undefined, 'startup').catch(() => undefined);
  }, [providers, startSync]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previous !== 'active')
        void startSync(undefined, 'foreground').catch(() => undefined);
      if (state !== 'active') {
        void engineRef.current?.then((engine) => engine.cancelAll());
        webRefs.current.clear();
        setWebHosts([]);
      }
      previous = state;
    });
    return () => subscription.remove();
  }, [startSync]);

  useEffect(() => {
    if (status.isSyncing || !webHosts.length) return;
    const timer = setTimeout(() => {
      webRefs.current.clear();
      setWebHosts([]);
    }, 60_000);
    return () => clearTimeout(timer);
  }, [status.isSyncing, webHosts]);

  useEffect(() => {
    activeRef.current = true;
    const jobs = jobsRef.current;
    return () => {
      activeRef.current = false;
      void engineRef.current?.then((engine) => engine.cancelAll());
      for (const job of jobs.values()) {
        clearTimeout(job.timeout);
        job.cleanup();
        job.reject(new ProviderError('unknown', 'Cancelled'));
      }
      jobs.clear();
    };
  }, []);

  const onMessage = useCallback(
    (providerId: ProviderId, event: WebViewMessageEvent) => {
      const job = jobsRef.current.get(providerId);
      if (!job || !isSessionProvider(job.provider.id)) return;
      try {
        if (event.nativeEvent.data.length > 260000) return;
        const origin = new URL(SESSION_PROVIDERS[job.provider.id].usageUrl)
          .origin;
        if (new URL(event.nativeEvent.url).origin !== origin) return;
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          url?: string;
          body?: string;
          text?: string;
          runId?: number;
        };
        if (data.runId !== job.runId) return;
        if (data.type === 'fast-miss') {
          loadFullPage(providerId, job.runId);
          return;
        }
        if (data.type === 'usage' && typeof data.body === 'string') {
          if (
            typeof data.url !== 'string' ||
            data.body.length > 200000 ||
            new URL(data.url).origin !== origin ||
            !/(?:usage|quota|rate[_-]?limits|copilot_internal)/i.test(
              new URL(data.url).pathname,
            )
          )
            return;
          const response = { url: data.url, body: data.body };
          const config = SESSION_PROVIDERS[job.provider.id];
          if (extractRawWindows([response], config.keyMap).length === 0) return;
          job.captured = [
            ...job.captured.filter((captured) => captured.url !== response.url),
            response,
          ];
          webRefs.current
            .get(providerId)
            ?.injectJavaScript(
              `if (window.__devgaugeApproveQuotaUrl) window.__devgaugeApproveQuotaUrl(${JSON.stringify(response.url)}); true;`,
            );
        } else if (data.type === 'text' && typeof data.text === 'string') {
          if (job.mode === 'api') return;
          job.text = data.text;
        } else {
          return;
        }
        const config = SESSION_PROVIDERS[job.provider.id];
        const byKey = new Map(
          extractRawWindows(job.captured, config.keyMap).map((window) => [
            window.key,
            window,
          ]),
        );
        const pageRaw = parseUsageText(job.text, config.keyMap);
        for (const window of pageRaw) {
          const exact = byKey.get(window.key);
          if (exact?.usedPercent === window.usedPercent)
            window.resetsAt ??= exact.resetsAt;
          // Page/API aliases (primary vs primary_window) describe the same
          // Codex quota. Replace that quota, not just an exact matching key.
          if (providerId === 'codex') {
            for (const [key, captured] of byKey) {
              if (config.keyMap[key].kind === config.keyMap[window.key].kind) {
                window.resetsAt ??= captured.resetsAt;
                byKey.delete(key);
              }
            }
          }
          byKey.set(window.key, window);
        }
        const windows = toDomainWindows(
          [...byKey.values()],
          config.keyMap,
          job.capturedAt,
        );
        const isReady = isQuotaReady(job.provider.id, windows);
        if (isReady) {
          const needsWorkspace =
            providerId === 'codex' &&
            needsWorkspaceCapture({
              mode: job.mode,
              windows,
              pageWindows: toDomainWindows(
                pageRaw,
                config.keyMap,
                job.capturedAt,
              ),
              expectsMonthly:
                job.provider.windows.some(
                  (window) => window.kind === 'monthly',
                ) || /workspace monthly credit limit/i.test(job.text),
            });
          // Keep observing late Claude reset labels and Codex workspace credits.
          // API-only partial data gets one fresh page fallback; the existing
          // deadline still saves verified usage when optional data is absent.
          if (needsResetTiming(job.provider.id, windows) || needsWorkspace) {
            job.partialWindows = windows;
            if (job.mode === 'api') loadFullPage(providerId, job.runId);
          } else {
            void finishWebJob(providerId, job.runId, windows);
          }
        }
      } catch {
        // Ignore messages that are not bridge payloads.
      }
    },
    [finishWebJob, loadFullPage],
  );

  return (
    <SyncContext.Provider
      value={{ ...status, startSync, cancelProvider, resetSync }}
    >
      {children}
      {webHosts.map(({ provider, runId, epoch }) =>
        isSessionProvider(provider.id) ? (
          <View
            key={`${provider.id}-${epoch}`}
            pointerEvents="none"
            style={styles.webHost}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <WebView
              ref={(webView) => {
                if (webView) webRefs.current.set(provider.id, webView);
                else webRefs.current.delete(provider.id);
              }}
              source={SESSION_SOURCES[provider.id]}
              originWhitelist={['https://*']}
              userAgent={SESSION_USER_AGENT}
              setSupportMultipleWindows={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              injectedJavaScriptBeforeContentLoaded={createSyncBridgeScript(
                runId,
              )}
              injectedJavaScript={createSyncBridgeScript(runId)}
              onMessage={(event) => onMessage(provider.id, event)}
              onError={() => void finishWebJob(provider.id, runId)}
              onHttpError={(event) => {
                // Resource failures (images/analytics) should not end a quota fetch.
                if (
                  event.nativeEvent.url !==
                  SESSION_PROVIDERS[provider.id as SessionProviderId].usageUrl
                )
                  return;
                const statusCode = event.nativeEvent.statusCode;
                void finishWebJob(
                  provider.id,
                  runId,
                  undefined,
                  new ProviderError(
                    statusCode === 401 || statusCode === 403
                      ? 'unauthorized'
                      : statusCode === 429
                        ? 'rate_limited'
                        : statusCode === 404
                          ? 'schema_changed'
                          : 'provider_unavailable',
                    'Provider usage page failed',
                    { httpStatus: statusCode },
                  ),
                );
              }}
              onShouldStartLoadWithRequest={(request) =>
                allowedSessionHost(
                  provider.id as SessionProviderId,
                  request.url,
                ) !== null
              }
            />
          </View>
        ) : null,
      )}
    </SyncContext.Provider>
  );
}

export function useSyncStatus(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used inside SyncProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  webHost: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});

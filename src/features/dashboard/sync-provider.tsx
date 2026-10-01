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

import type { UsageWindow } from '@/domain/usage';
import type { ProviderId } from '@/domain/providers';
import { syncAntigravity } from '@/providers/antigravity/sync';
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
import { saveSessionSnapshot } from '@/services/web-session/session';
import {
  extractRawWindows,
  toDomainWindows,
  type CapturedResponse,
} from '@/services/web-session/usage-extract';
import { parseUsageText } from '@/services/web-session/usage-text';
import type {
  ProviderFixture,
  ProviderState,
} from '@/testing/fixtures/providers';

import { useProviderViews, useReloadProviders } from './app-providers';
import { retrySync } from './sync-retry';

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
};

type SyncContextValue = SyncStatus & {
  startSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

type WebJob = {
  runId: number;
  mode: 'api' | 'page';
  capturedAt: Date;
  provider: ProviderFixture;
  captured: CapturedResponse[];
  text: string;
  done: boolean;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (result: 'success' | 'retry' | 'stop') => void;
};

type WebHost = { provider: ProviderFixture; runId: number; epoch: number };
const SESSION_SOURCES = Object.fromEntries(
  Object.entries(SESSION_PROVIDERS).map(([id, config]) => [
    id,
    { uri: config.usageUrl },
  ]),
);

function hasCodexPageUsage(windows: UsageWindow[]): boolean {
  const fiveHour = windows.find((window) => window.kind === 'rolling');
  const weekly = windows.find((window) => window.kind === 'weekly');
  // For Codex, page text is the authoritative remaining-percent source. Wait
  // for its reset labels as well, rather than persisting an early API payload.
  return Boolean(
    (fiveHour?.resetsAt || fiveHour?.resetsSourceText) &&
    (weekly?.resetsAt || weekly?.resetsSourceText),
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  });
  const [webHosts, setWebHosts] = useState<WebHost[]>([]);
  const webRefs = useRef(new Map<ProviderId, WebView>());
  const jobsRef = useRef(new Map<ProviderId, WebJob>());
  const nextRunId = useRef(0);
  const runningRef = useRef(false);
  const autoStartedRef = useRef(false);

  const finishWebJob = useCallback(
    async (
      providerId: ProviderId,
      runId: number,
      windows?: UsageWindow[],
      failure: 'retry' | 'stop' = 'retry',
    ) => {
      const job = jobsRef.current.get(providerId);
      if (!job || job.done || job.runId !== runId) return;
      job.done = true;
      clearTimeout(job.timeout);
      jobsRef.current.delete(providerId);
      webRefs.current
        .get(providerId)
        ?.injectJavaScript(
          `if (window.__devgaugeRunId === ${runId}) window.__devgaugeCaptureActive = false; true;`,
        );
      let result: 'success' | 'retry' | 'stop' = failure;
      try {
        if (
          windows &&
          windows.length > 0 &&
          isSessionProvider(job.provider.id)
        ) {
          const db = await getAppDatabase();
          let ids = 0;
          await saveSessionSnapshot({
            db,
            providerId: job.provider.id,
            displayName: `${SESSION_PROVIDERS[job.provider.id].label} session`,
            windows,
            fetchedAt: new Date().toISOString(),
            now: new Date(),
            nextId: () => `${job.provider.id}-${Date.now()}-${(ids += 1)}`,
          });
          // Paint the completed provider immediately while the others keep fetching.
          await reload();
          result = 'success';
        }
      } catch {
        // Keep the previous snapshot and advance to the next provider.
      } finally {
        job.resolve(result);
      }
    },
    [reload],
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
        () => void finishWebJob(providerId, runId),
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
    (provider: ProviderFixture) =>
      new Promise<'success' | 'retry' | 'stop'>((resolve) => {
        const runId = ++nextRunId.current;
        const webView = webRefs.current.get(provider.id);
        const timeout = setTimeout(
          () =>
            webView
              ? loadFullPage(provider.id, runId)
              : void finishWebJob(provider.id, runId),
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
        });
        setWebHosts((current) => {
          const existing = current.find(
            (host) => host.provider.id === provider.id,
          );
          const host = { provider, runId, epoch: existing?.epoch ?? runId };
          return existing
            ? current.map((item) =>
                item.provider.id === provider.id ? host : item,
              )
            : [...current, host];
        });
        if (webView) webView.injectJavaScript(refreshSessionScript(runId));
      }),
    [finishWebJob, loadFullPage],
  );

  const startSync = useCallback(async () => {
    if (runningRef.current) return;
    const targets = providers.filter(
      (provider) =>
        SYNCABLE.includes(provider.state) &&
        (isSessionProvider(provider.id) || provider.id === 'gemini-cli'),
    );
    if (targets.length === 0) return;

    runningRef.current = true;
    // Defer the visual transition outside an app-open effect.
    await Promise.resolve();
    setStatus({
      isSyncing: true,
      completedProviderIds: [],
      syncingProviderIds: targets.map((provider) => provider.id),
      displayedProviderId: targets[0].id,
    });
    let completionQueue = Promise.resolve();
    const acknowledge = (providerId: ProviderId) => {
      completionQueue = completionQueue.then(async () => {
        setStatus((current) => ({
          ...current,
          displayedProviderId: providerId,
        }));
        await new Promise((resolve) => setTimeout(resolve, 250));
      });
    };
    try {
      await Promise.all(
        targets.map(async (provider) => {
          const success = await retrySync(async () => {
            if (provider.id === 'gemini-cli') {
              try {
                const db = await getAppDatabase();
                let ids = 0;
                const result = await syncAntigravity({
                  db,
                  vault: createSecureVault(createSecureStoreBackend()),
                  fetchImpl: fetchWithTimeout,
                  nextId: () => `antigravity-${Date.now()}-${(ids += 1)}`,
                });
                await reload();
                return result === 'success'
                  ? 'success'
                  : result === 'needs-sign-in'
                    ? 'stop'
                    : 'retry';
              } catch {
                return 'retry';
              }
            } else {
              return await syncWebProvider(provider);
            }
          });
          setStatus((current) => ({
            ...current,
            completedProviderIds: success
              ? [...current.completedProviderIds, provider.id]
              : current.completedProviderIds,
            syncingProviderIds: current.syncingProviderIds.filter(
              (id) => id !== provider.id,
            ),
          }));
          if (success) acknowledge(provider.id);
        }),
      );
      await completionQueue;
    } finally {
      setStatus({
        isSyncing: false,
        completedProviderIds: [],
        syncingProviderIds: [],
        displayedProviderId: null,
      });
      runningRef.current = false;
    }
  }, [providers, reload, syncWebProvider]);

  // Runs once per app session. The same status control represents this work.
  useEffect(() => {
    if (autoStartedRef.current || runningRef.current) return;
    const hasTarget = providers.some(
      (provider) =>
        SYNCABLE.includes(provider.state) &&
        (isSessionProvider(provider.id) || provider.id === 'gemini-cli'),
    );
    if (!hasTarget) return;
    const timer = setTimeout(() => {
      autoStartedRef.current = true;
      void startSync();
    }, 0);
    return () => clearTimeout(timer);
  }, [providers, startSync]);

  // Idle sessions can be rebuilt after returning from the background, freeing
  // the website renderers while DevGauge is not being used.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && !runningRef.current) {
        webRefs.current.clear();
        setWebHosts([]);
      }
    });
    return () => subscription.remove();
  }, []);

  const onMessage = useCallback(
    (providerId: ProviderId, event: WebViewMessageEvent) => {
      const job = jobsRef.current.get(providerId);
      if (!job || !isSessionProvider(job.provider.id)) return;
      try {
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
          const response = { url: data.url ?? '', body: data.body };
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
        for (const window of parseUsageText(job.text, config.keyMap)) {
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
        const isReady =
          windows.length > 0 &&
          (job.provider.id !== 'claude' ||
            (windows.some((window) => window.kind === 'rolling') &&
              windows.some((window) => window.kind === 'weekly'))) &&
          (job.provider.id !== 'command-code' ||
            ['rolling', 'weekly', 'monthly'].every((kind) =>
              windows.some((window) => window.kind === kind),
            )) &&
          (job.provider.id !== 'codex' || hasCodexPageUsage(windows));
        if (isReady) void finishWebJob(providerId, job.runId, windows);
      } catch {
        // Ignore messages that are not bridge payloads.
      }
    },
    [finishWebJob, loadFullPage],
  );

  return (
    <SyncContext.Provider value={{ ...status, startSync }}>
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
                  statusCode === 401 || statusCode === 403 || statusCode === 404
                    ? 'stop'
                    : 'retry',
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

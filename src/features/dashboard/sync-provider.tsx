import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { UsageWindow } from '@/domain/usage';
import type { ProviderId } from '@/domain/providers';
import { syncAntigravity } from '@/providers/antigravity/sync';
import { getAppDatabase } from '@/services/app-database-store';
import { createSecureStoreBackend } from '@/storage/secure-store-backend';
import { createSecureVault } from '@/storage/secure-vault';
import { USAGE_BRIDGE_SCRIPT } from '@/services/web-session/bridge-script';
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
  provider: ProviderFixture;
  captured: CapturedResponse[];
  text: string;
  done: boolean;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (result: 'success' | 'retry' | 'stop') => void;
};

function hasCodexPageUsage(windows: UsageWindow[]): boolean {
  const fiveHour = windows.find((window) => window.kind === 'rolling');
  const weekly = windows.find((window) => window.kind === 'weekly');
  // For Codex, page text is the authoritative remaining-percent source. Wait
  // for its reset labels as well, rather than persisting an early API payload.
  return Boolean(fiveHour?.resetsAt && weekly?.resetsAt);
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
  const [webProviders, setWebProviders] = useState<ProviderFixture[]>([]);
  const jobsRef = useRef(new Map<ProviderId, WebJob>());
  const runningRef = useRef(false);
  const autoStartedRef = useRef(false);

  const finishWebJob = useCallback(
    async (providerId: ProviderId, windows?: UsageWindow[]) => {
      const job = jobsRef.current.get(providerId);
      if (!job || job.done) return;
      job.done = true;
      clearTimeout(job.timeout);
      jobsRef.current.delete(providerId);
      let result: 'success' | 'retry' | 'stop' = 'retry';
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
          // This makes the completed provider card update before the next one starts.
          await reload();
          result = 'success';
        }
      } catch {
        // Keep the previous snapshot and advance to the next provider.
      } finally {
        setWebProviders((current) =>
          current.filter((provider) => provider.id !== providerId),
        );
        job.resolve(result);
      }
    },
    [reload],
  );

  const syncWebProvider = useCallback(
    (provider: ProviderFixture) =>
      new Promise<'success' | 'retry' | 'stop'>((resolve) => {
        const timeout = setTimeout(
          () => void finishWebJob(provider.id),
          PER_PROVIDER_TIMEOUT_MS,
        );
        jobsRef.current.set(provider.id, {
          provider,
          captured: [],
          text: '',
          done: false,
          timeout,
          resolve,
        });
        setWebProviders((current) => [...current, provider]);
      }),
    [finishWebJob],
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
      displayedProviderId: null,
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
        };
        if (data.type === 'usage' && typeof data.body === 'string') {
          job.captured.push({ url: data.url ?? '', body: data.body });
        } else if (data.type === 'text' && typeof data.text === 'string') {
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
        const windows = toDomainWindows([...byKey.values()], config.keyMap);
        const isReady =
          windows.length > 0 &&
          (job.provider.id !== 'codex' || hasCodexPageUsage(windows));
        if (isReady) void finishWebJob(providerId, windows);
      } catch {
        // Ignore messages that are not bridge payloads.
      }
    },
    [finishWebJob],
  );

  return (
    <SyncContext.Provider value={{ ...status, startSync }}>
      {children}
      {webProviders.map((provider) =>
        isSessionProvider(provider.id) ? (
          <View key={provider.id} pointerEvents="none" style={styles.webHost}>
            <WebView
              source={{ uri: SESSION_PROVIDERS[provider.id].usageUrl }}
              originWhitelist={['https://*']}
              userAgent={SESSION_USER_AGENT}
              setSupportMultipleWindows={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              injectedJavaScriptBeforeContentLoaded={USAGE_BRIDGE_SCRIPT}
              injectedJavaScript={USAGE_BRIDGE_SCRIPT}
              onMessage={(event) => onMessage(provider.id, event)}
              onError={() => void finishWebJob(provider.id)}
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
    width: 1,
    height: 1,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});

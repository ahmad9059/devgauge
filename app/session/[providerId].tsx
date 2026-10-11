import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type { WebViewErrorEvent } from 'react-native-webview/lib/WebViewTypes';

import { Button, ErrorState, Header, Screen } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { UsageWindow } from '@/domain/usage';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import { getAppDatabase } from '@/services/app-database-store';
import { USAGE_BRIDGE_SCRIPT } from '@/services/web-session/bridge-script';
import {
  allowedSessionHost,
  isSessionProvider,
  SESSION_PROVIDERS,
  SESSION_USER_AGENT,
} from '@/services/web-session/session-config';
import {
  describeLoadError,
  isRetryableLoadError,
  loadRetryDelayMs,
  MAX_LOAD_RETRIES,
  type LoadErrorMessage,
} from '@/services/web-session/load-retry';
import { saveSessionSnapshot } from '@/services/web-session/session';
import {
  extractRawWindows,
  toDomainWindows,
  type CapturedResponse,
} from '@/services/web-session/usage-extract';
import { parseUsageText } from '@/services/web-session/usage-text';
import {
  isQuotaReady,
  needsResetTiming,
  needsWorkspaceCapture,
} from '@/services/web-session/quota-readiness';

/**
 * Embedded session. The provider page loads inside the app; after the user
 * signs in, DevGauge reads the usage the page loads, syncs it automatically, and
 * returns to the dashboard. No password is read and no cookie leaves the device.
 */
export default function SessionScreen() {
  const params = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const webView = useRef<WebView>(null);
  const capturedRef = useRef<CapturedResponse[]>([]);
  const capturedAtRef = useRef(new Date());
  const pageTextRef = useRef('');
  const syncedRef = useRef(false);
  const quotaDeadlineRef = useRef<number | null>(null);
  const [windows, setWindows] = useState<UsageWindow[]>([]);
  const [status, setStatus] = useState('Connecting…');
  const [busy, setBusy] = useState(false);
  const loadAttempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadError, setLoadError] = useState<LoadErrorMessage | null>(null);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const providerId = params.providerId;
  const sessionProvider =
    typeof providerId === 'string' && isSessionProvider(providerId)
      ? providerId
      : null;

  const sync = async () => {
    if (windows.length === 0 || sessionProvider === null) return;
    setBusy(true);
    setStatus('Syncing usage…');
    try {
      const db = await getAppDatabase();
      let ids = 0;
      await saveSessionSnapshot({
        db,
        providerId: sessionProvider,
        displayName: `${SESSION_PROVIDERS[sessionProvider].label} session`,
        windows,
        fetchedAt: new Date().toISOString(),
        now: new Date(),
        nextId: () => `${sessionProvider}-${Date.now()}-${(ids += 1)}`,
      });
      await reload();
      setStatus('Connected.');
      router.replace('/(tabs)/usage');
    } catch {
      syncedRef.current = false;
      setStatus('Could not sync. Checking again…');
    } finally {
      setBusy(false);
    }
  };

  // Give late reset labels/workspace credits a bounded chance to arrive before
  // leaving the sign-in page. Verified usage still saves at the deadline.
  useEffect(() => {
    if (
      !sessionProvider ||
      !isQuotaReady(sessionProvider, windows) ||
      syncedRef.current
    )
      return;
    const finish = () => {
      syncedRef.current = true;
      void sync();
    };
    const pageWindows = toDomainWindows(
      parseUsageText(
        pageTextRef.current,
        SESSION_PROVIDERS[sessionProvider].keyMap,
      ),
      SESSION_PROVIDERS[sessionProvider].keyMap,
      capturedAtRef.current,
    );
    const waitForPage =
      sessionProvider === 'codex' &&
      needsWorkspaceCapture({
        mode: 'page',
        windows,
        pageWindows,
        expectsMonthly: /workspace monthly credit limit/i.test(
          pageTextRef.current,
        ),
      });
    if (
      !needsResetTiming(
        sessionProvider,
        windows,
        isQuotaReady(sessionProvider, pageWindows),
      ) &&
      !waitForPage
    ) {
      finish();
      return;
    }
    quotaDeadlineRef.current ??= Date.now() + 12_000;
    const timer = setTimeout(
      finish,
      Math.max(0, quotaDeadlineRef.current - Date.now()),
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows, sessionProvider]);

  if (sessionProvider === null) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ErrorState
          title="Not available"
          description="This provider has no in-app sign-in."
        />
      </Screen>
    );
  }

  const config = SESSION_PROVIDERS[sessionProvider];
  const host = new URL(config.usageUrl).hostname;

  const reloadPage = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    loadAttempts.current = 0;
    setLoadError(null);
    setStatus('Connecting…');
    webView.current?.reload();
  };

  // Some mobile networks reset a share of fresh TLS handshakes to a site
  // (net::ERR_CONNECTION_RESET). Retrying quietly gets through most of them.
  const onLoadError = (event: WebViewErrorEvent) => {
    const description = event.nativeEvent.description;
    if (
      isRetryableLoadError(description) &&
      loadAttempts.current < MAX_LOAD_RETRIES
    ) {
      loadAttempts.current += 1;
      setStatus(
        `Connection problem. Retrying (${loadAttempts.current}/${MAX_LOAD_RETRIES})…`,
      );
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(
        () => webView.current?.reload(),
        loadRetryDelayMs(loadAttempts.current),
      );
      return;
    }
    setLoadError(describeLoadError(host, description));
    setStatus('Could not connect.');
  };

  const onLoadSuccess = () => {
    loadAttempts.current = 0;
    setLoadError(null);
    setStatus((current) =>
      /^(Connection problem|Could not connect)/.test(current)
        ? 'Connecting…'
        : current,
    );
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        url?: string;
        body?: string;
        text?: string;
      };
      if (data.type === 'usage' && typeof data.body === 'string') {
        capturedRef.current.push({ url: data.url ?? '', body: data.body });
      } else if (data.type === 'text' && typeof data.text === 'string') {
        pageTextRef.current = data.text;
      } else {
        return;
      }
      // Page text is authoritative for used-vs-remaining; it overrides JSON.
      const byKey = new Map(
        extractRawWindows(capturedRef.current, config.keyMap).map((window) => [
          window.key,
          window,
        ]),
      );
      for (const window of parseUsageText(pageTextRef.current, config.keyMap)) {
        const exact = byKey.get(window.key);
        if (exact?.usedPercent === window.usedPercent)
          window.resetsAt ??= exact.resetsAt;
        if (sessionProvider === 'codex') {
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
        capturedAtRef.current,
      );
      if (windows.length > 0) {
        setWindows(windows);
        setStatus('Usage found. Finishing…');
      }
    } catch {
      // Non-JSON messages are ignored.
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <Header title={config.label} />
        <View style={styles.statusRow}>
          {busy ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
            />
          ) : null}
          <Text
            accessibilityLiveRegion="polite"
            style={[
              typography.monoCaption,
              { color: theme.colors.textSecondary },
            ]}
          >
            {status}
          </Text>
        </View>
        <View style={styles.webviewWrap}>
          <WebView
            ref={webView}
            style={styles.webview}
            source={{ uri: config.usageUrl }}
            originWhitelist={['https://*']}
            userAgent={SESSION_USER_AGENT}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            injectedJavaScriptBeforeContentLoaded={USAGE_BRIDGE_SCRIPT}
            injectedJavaScript={USAGE_BRIDGE_SCRIPT}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={(request) => {
              const host = allowedSessionHost(sessionProvider, request.url);
              if (host === null) return false;
              return true;
            }}
            onError={onLoadError}
            onLoad={onLoadSuccess}
            renderError={() => (
              <View
                style={[
                  styles.loadError,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                {loadError ? (
                  <ErrorState
                    title={loadError.title}
                    description={loadError.description}
                    onRetry={reloadPage}
                    retryLabel="Reload"
                  />
                ) : (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textSecondary}
                  />
                )}
              </View>
            )}
          />
        </View>
        <Button
          label="Reload"
          variant="ghost"
          icon="refresh"
          onPress={reloadPage}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webviewWrap: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  webview: { flex: 1 },
  loadError: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

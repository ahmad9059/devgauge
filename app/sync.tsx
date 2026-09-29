import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { Header, Screen } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { UsageWindow } from '@/domain/usage';
import {
  useProviderViews,
  useReloadProviders,
} from '@/features/dashboard/app-providers';
import type { ProviderState } from '@/testing/fixtures/providers';
import { getAppDatabase } from '@/services/app-database-store';
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

const SYNCABLE: ProviderState[] = [
  'connected',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];
const PER_PROVIDER_TIMEOUT_MS = 12_000;

/**
 * Refreshes every connected provider by re-opening its session page (cookies
 * persist in the WebView store), reading the usage it loads, and saving it.
 * Runs sequentially with a spinner, then returns to the dashboard.
 */
export default function SyncScreen() {
  const router = useRouter();
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const providers = useProviderViews();
  const targets = providers.filter(
    (provider) =>
      isSessionProvider(provider.id) && SYNCABLE.includes(provider.state),
  );

  const [index, setIndex] = useState(0);
  const capturedRef = useRef<CapturedResponse[]>([]);
  const textRef = useRef('');
  const handledRef = useRef(false);
  const finishedRef = useRef(false);

  const current = targets[index];
  const config =
    current && isSessionProvider(current.id)
      ? SESSION_PROVIDERS[current.id]
      : undefined;

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await reload().catch(() => undefined);
    router.replace('/(tabs)/usage');
  };

  const advance = async (windows?: UsageWindow[]) => {
    if (handledRef.current || !current || !config) return;
    handledRef.current = true;
    if (windows && windows.length > 0) {
      try {
        const db = await getAppDatabase();
        let ids = 0;
        await saveSessionSnapshot({
          db,
          providerId: current.id,
          displayName: `${config.label} session`,
          windows,
          fetchedAt: new Date().toISOString(),
          now: new Date(),
          nextId: () => `${current.id}-${Date.now()}-${(ids += 1)}`,
        });
      } catch {
        // Keep going; a single failure must not block the rest.
      }
    }
    if (index + 1 >= targets.length) {
      await finish();
    } else {
      capturedRef.current = [];
      textRef.current = '';
      handledRef.current = false;
      setIndex(index + 1);
    }
  };

  useEffect(() => {
    if (targets.length === 0) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.length]);

  useEffect(() => {
    handledRef.current = false;
    capturedRef.current = [];
    textRef.current = '';
    if (!current) return;
    const timer = setTimeout(() => void advance(), PER_PROVIDER_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  const onMessage = (event: WebViewMessageEvent) => {
    if (!config) return;
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
        textRef.current = data.text;
      } else {
        return;
      }
      const byKey = new Map(
        extractRawWindows(capturedRef.current, config.keyMap).map((window) => [
          window.key,
          window,
        ]),
      );
      for (const window of parseUsageText(textRef.current, config.keyMap)) {
        byKey.set(window.key, window);
      }
      const windows = toDomainWindows([...byKey.values()], config.keyMap);
      if (windows.length > 0) void advance(windows);
    } catch {
      // Ignore non-JSON messages.
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <Header title="Syncing" subtitle={config?.label ?? 'Finishing'} />
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          <Text
            accessibilityLiveRegion="polite"
            style={[
              typography.monoCaption,
              { color: theme.colors.textSecondary },
            ]}
          >
            {config
              ? `Syncing ${config.label} · ${index + 1}/${targets.length}`
              : 'Done'}
          </Text>
        </View>
        {config ? (
          <View style={styles.webviewWrap}>
            <WebView
              key={current?.id}
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
              onShouldStartLoadWithRequest={(request) =>
                allowedSessionHost(
                  current.id as SessionProviderId,
                  request.url,
                ) !== null
              }
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webviewWrap: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  webview: { flex: 1 },
});

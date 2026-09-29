import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import {
  Button,
  Card,
  ErrorState,
  Header,
  Notice,
  Screen,
  Stack,
} from '@/components/ui';
import { useTheme } from '@/design/theme-provider';
import type { UsageWindow } from '@/domain/usage';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import { getAppDatabase } from '@/services/app-database-store';
import { USAGE_BRIDGE_SCRIPT } from '@/services/web-session/bridge-script';
import {
  allowedSessionHost,
  isSessionProvider,
  SESSION_PROVIDERS,
} from '@/services/web-session/session-config';
import { saveSessionSnapshot } from '@/services/web-session/session';
import {
  extractUsageWindows,
  type CapturedResponse,
} from '@/services/web-session/usage-extract';

/**
 * Embedded website-session flow. The user signs in on the provider's own page
 * inside the app; DevGauge keeps the session in the WebView cookie store and
 * reads only the usage response the page itself fetches. Passwords and typed
 * credentials are never read, and no cookie is exported off device.
 *
 * Owner-authorized experimental path: it stays labeled experimental because the
 * page's payload can change.
 */
export default function SessionScreen() {
  const params = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const webView = useRef<WebView>(null);
  const capturedRef = useRef<CapturedResponse[]>([]);
  const [windows, setWindows] = useState<UsageWindow[]>([]);
  const [status, setStatus] = useState('Sign in to load your usage page.');
  const [saving, setSaving] = useState(false);

  const providerId = params.providerId;
  const isSession =
    typeof providerId === 'string' && isSessionProvider(providerId);

  if (!isSession) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ErrorState
          title="No in-app sign-in"
          description="This provider has no embedded session flow."
        />
      </Screen>
    );
  }

  const config = SESSION_PROVIDERS[providerId];

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        url?: string;
        body?: string;
      };
      if (data.type !== 'usage' || typeof data.body !== 'string') return;
      capturedRef.current.push({ url: data.url ?? '', body: data.body });
      const extracted = extractUsageWindows(capturedRef.current, config.keyMap);
      if (extracted.windows.length > 0) {
        setWindows(extracted.windows);
        setStatus(
          `${extracted.windows.length} usage window(s) detected. Save to see them on the dashboard.`,
        );
      } else {
        setStatus('Signed in. Open the usage page to load your limits.');
      }
    } catch {
      // Ignore non-JSON messages.
    }
  };

  const save = async () => {
    if (windows.length === 0) return;
    setSaving(true);
    try {
      const db = await getAppDatabase();
      let ids = 0;
      await saveSessionSnapshot({
        db,
        providerId,
        displayName: `${config.label} web session`,
        windows,
        fetchedAt: new Date().toISOString(),
        now: new Date(),
        nextId: () => `${providerId}-${Date.now()}-${(ids += 1)}`,
      });
      await reload();
      router.replace('/(tabs)/usage');
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <Header
          title={`Sign in to ${config.label}`}
          subtitle="Experimental in-app session"
        />
        <Notice tone="warning" icon="shield-lock-outline">
          DevGauge reads only the usage response this page fetches. It never
          sees your password and never sends your session off device.
        </Notice>
        <Text
          accessibilityLiveRegion="polite"
          style={[
            typography.monoCaption,
            { color: theme.colors.textSecondary },
          ]}
        >
          {status}
        </Text>
        <Stack gap="sm">
          <Button
            label={windows.length > 0 ? 'Save usage' : 'Waiting for usage…'}
            icon="download-outline"
            loading={saving}
            disabled={windows.length === 0 || saving}
            onPress={save}
          />
          <Button
            label="Reload page"
            variant="ghost"
            icon="refresh"
            onPress={() => webView.current?.reload()}
          />
        </Stack>
        <View style={styles.webviewWrap}>
          <WebView
            ref={webView}
            style={styles.webview}
            source={{ uri: config.usageUrl }}
            originWhitelist={['https://*']}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            injectedJavaScriptBeforeContentLoaded={USAGE_BRIDGE_SCRIPT}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={(request) => {
              const host = allowedSessionHost(providerId, request.url);
              if (host === null) {
                setStatus('Blocked a navigation outside the provider.');
                return false;
              }
              return true;
            }}
            onError={() =>
              setStatus('Could not load the page. Check your connection.')
            }
            onHttpError={({ nativeEvent }) =>
              setStatus(`The page returned HTTP ${nativeEvent.statusCode}.`)
            }
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  webviewWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: { flex: 1 },
});

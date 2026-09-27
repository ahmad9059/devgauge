import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';

import { Button, Header, Notice, Screen, Stack } from '@/components/ui';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import {
  allowedSpikeHost,
  blockedSpikeHost,
  spikeProviders,
  type SpikeProvider,
} from '@/config/web-session-spike';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

function WebSessionSpike() {
  const { theme, typography } = useTheme();
  const [provider, setProvider] = useState<SpikeProvider>('claude');
  const [hostname, setHostname] = useState('claude.ai');
  const [status, setStatus] = useState('Open a provider to test login.');
  const webView = useRef<WebView>(null);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <Header
          title="Local WebView feasibility"
          subtitle="Internal test build only"
        />
        <Notice tone="warning" icon="account-key-outline">
          Use test accounts. This screen never reads passwords, cookies, or page
          content.
        </Notice>
        <Stack gap="sm">
          <View style={styles.choices}>
            {(Object.keys(spikeProviders) as SpikeProvider[]).map((id) => (
              <Button
                key={id}
                label={spikeProviders[id].label}
                variant={provider === id ? 'primary' : 'secondary'}
                onPress={() => {
                  setProvider(id);
                  setHostname(new URL(spikeProviders[id].startUrl).hostname);
                  setStatus('Loading provider website.');
                }}
              />
            ))}
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              typography.monoLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Host: {hostname} · {status}
          </Text>
          <Button
            label="Reload website"
            variant="ghost"
            icon="refresh"
            onPress={() => webView.current?.reload()}
          />
        </Stack>
        <WebView
          key={provider}
          ref={webView}
          style={styles.webview}
          source={{ uri: spikeProviders[provider].startUrl }}
          originWhitelist={['https://*']}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          incognito={false}
          onShouldStartLoadWithRequest={(request) => {
            const nextHost = allowedSpikeHost(provider, request.url);
            if (!nextHost) {
              setStatus(`Blocked host: ${blockedSpikeHost(request.url)}`);
              return false;
            }
            setHostname(nextHost);
            return true;
          }}
          onError={() =>
            setStatus('Website loading failed; record this in the test matrix.')
          }
          onHttpError={({ nativeEvent }) =>
            setStatus(`Website returned HTTP ${nativeEvent.statusCode}.`)
          }
          onLoadEnd={() =>
            setStatus('Page loaded. Verify login and usage manually.')
          }
        />
      </View>
    </Screen>
  );
}

export default function WebSessionSpikeRoute() {
  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;
  return <WebSessionSpike />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  webview: { flex: 1, borderRadius: 12, overflow: 'hidden' },
});

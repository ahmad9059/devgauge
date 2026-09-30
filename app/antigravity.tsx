import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  getRandomBytesAsync,
} from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';

import { Button, Header, Notice, Screen } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { deriveWindow, type UsageWindow } from '@/domain/usage';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import {
  ANTIGRAVITY_HOSTS,
  ANTIGRAVITY_TOKEN_URL,
  buildAuthorizeUrl,
  parseCallbackUrl,
  parseTokenResponse,
  tokenExchangeBody,
} from '@/providers/antigravity/oauth';
import {
  ANTIGRAVITY_QUOTA_ENDPOINT,
  parseQuotaPayload,
} from '@/providers/antigravity/quota';
import { base64UrlEncode } from '@/services/auth/pkce';
import { getAppDatabase } from '@/services/app-database-store';
import { saveSessionSnapshot } from '@/services/web-session/session';

type Pkce = { verifier: string; challenge: string; state: string };

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function makePkce(): Promise<Pkce> {
  const verifier = base64UrlEncode(await getRandomBytesAsync(32));
  const digestHex = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    verifier,
  );
  return {
    verifier,
    challenge: base64UrlEncode(hexToBytes(digestHex)),
    state: base64UrlEncode(await getRandomBytesAsync(32)),
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 20_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Antigravity sign-in: Google OAuth (public client + PKCE) inside the app, then
 * the Antigravity/Code Assist quota for the signed-in account. The token is held
 * in memory for the quota request only; no password is ever read.
 */
export default function AntigravityScreen() {
  const router = useRouter();
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const pkceRef = useRef<Pkce | null>(null);
  const handledRef = useRef(false);
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('Sign in with Google.');
  const [busy, setBusy] = useState(false);

  const startAuth = async () => {
    handledRef.current = false;
    const pkce = await makePkce();
    pkceRef.current = pkce;
    setUrl(buildAuthorizeUrl({ challenge: pkce.challenge, state: pkce.state }));
  };

  useEffect(() => {
    let active = true;
    void makePkce().then((pkce) => {
      if (!active) return;
      pkceRef.current = pkce;
      setUrl(
        buildAuthorizeUrl({ challenge: pkce.challenge, state: pkce.state }),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const save = async (windows: UsageWindow[]) => {
    const db = await getAppDatabase();
    let ids = 0;
    await saveSessionSnapshot({
      db,
      providerId: 'gemini-cli',
      displayName: 'Antigravity',
      windows,
      fetchedAt: new Date().toISOString(),
      now: new Date(),
      nextId: () => `antigravity-${Date.now()}-${(ids += 1)}`,
    });
    await reload();
    router.replace('/(tabs)/usage');
  };

  const handleCode = async (code: string) => {
    if (handledRef.current || !pkceRef.current) return;
    handledRef.current = true;
    setBusy(true);
    try {
      setStatus('Exchanging sign-in…');
      const tokenResponse = await fetchWithTimeout(ANTIGRAVITY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenExchangeBody({ code, verifier: pkceRef.current.verifier }),
      });
      if (!tokenResponse.ok) {
        const detail = (await tokenResponse.text()).slice(0, 140);
        throw new Error(`token HTTP ${tokenResponse.status} ${detail}`);
      }
      const token = parseTokenResponse(await tokenResponse.json());

      setStatus('Reading usage…');
      const quotaResponse = await fetchWithTimeout(ANTIGRAVITY_QUOTA_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      const quotaText = await quotaResponse.text();
      let quotaJson: unknown = null;
      try {
        quotaJson = JSON.parse(quotaText);
      } catch {
        quotaJson = null;
      }
      const windows = quotaJson ? parseQuotaPayload(quotaJson) : [];
      if (windows.length === 0) {
        windows.push(
          deriveWindow({
            externalKey: 'antigravity.account',
            kind: 'rolling',
            label: 'Antigravity',
            unit: 'percent',
            derivation: 'provider',
          }),
        );
        setStatus(
          `Connected · quota HTTP ${quotaResponse.status}. ${
            quotaText.slice(0, 120) || 'No quota buckets returned.'
          }`,
        );
        setBusy(false);
        return;
      }
      setStatus('Saving…');
      await save(windows);
    } catch (error) {
      handledRef.current = false;
      setBusy(false);
      setStatus(
        `Sign-in failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.screen}>
        <Header title="Antigravity" subtitle="Sign in with Google" />
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
        <Notice tone="info" icon="information-outline">
          DevGauge reads only your model quota. Your password is never seen and
          the token is not stored.
        </Notice>
        <View style={styles.webviewWrap}>
          {url ? (
            <WebView
              style={styles.webview}
              source={{ uri: url }}
              originWhitelist={['https://*']}
              setSupportMultipleWindows={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              onShouldStartLoadWithRequest={(request) => {
                const callback = parseCallbackUrl(request.url);
                if (callback) {
                  if (callback.kind === 'code') void handleCode(callback.code);
                  else setStatus(`Google returned: ${callback.error}`);
                  return false;
                }
                try {
                  const match = /^https:\/\/([^/?#]+)/.exec(request.url);
                  const host = match ? match[1].toLowerCase() : '';
                  return ANTIGRAVITY_HOSTS.some(
                    (allowed) =>
                      host === allowed || host.endsWith(`.${allowed}`),
                  );
                } catch {
                  return false;
                }
              }}
            />
          ) : (
            <ActivityIndicator color={theme.colors.textSecondary} />
          )}
        </View>
        <Button
          label="Reload"
          variant="ghost"
          icon="refresh"
          onPress={() => void startAuth()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  webviewWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  webview: { flex: 1 },
});

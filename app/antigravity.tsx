import {
  CryptoDigestAlgorithm,
  digestStringAsync,
  getRandomBytesAsync,
} from 'expo-crypto';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, Header, Notice, Screen, ScreenScroll } from '@/components/ui';
import { borderWidths, radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { UsageWindow } from '@/domain/usage';
import { useReloadProviders } from '@/features/dashboard/app-providers';
import {
  ANTIGRAVITY_TOKEN_URL,
  buildAuthorizeUrl,
  extractAuthCode,
  parseTokenResponse,
  tokenExchangeBody,
} from '@/providers/antigravity/oauth';
import { loadAntigravityQuota } from '@/providers/antigravity/quota';
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Antigravity sign-in. Google blocks OAuth inside embedded WebViews, so the
 * consent page opens in a Chrome Custom Tab (a real browser surface) and the
 * code shown on the redirect page is pasted back here. PKCE + the client secret
 * complete the exchange, then the Cloud Code Assist quota is read. The access
 * token is used in memory only; the password is never seen by DevGauge.
 */
export default function AntigravityScreen() {
  const router = useRouter();
  const { theme, typography } = useTheme();
  const reload = useReloadProviders();
  const pkceRef = useRef<Pkce | null>(null);
  const [status, setStatus] = useState(
    'Open Google sign-in to read your quota.',
  );
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void makePkce().then((pkce) => {
      if (active) pkceRef.current = pkce;
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

  const openSignIn = async () => {
    setBusy(true);
    try {
      const pkce = pkceRef.current ?? (await makePkce());
      pkceRef.current = pkce;
      setStatus('Sign in and approve access; then copy the code shown.');
      await WebBrowser.openBrowserAsync(
        buildAuthorizeUrl({ challenge: pkce.challenge, state: pkce.state }),
        { showTitle: true, enableBarCollapsing: true },
      );
      setStatus('Paste the code from the browser to finish.');
    } catch (error) {
      setStatus(`Could not open the browser: ${message(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const code = extractAuthCode(pasted);
    if (!code) {
      setStatus('No authorization code found. Copy the code from the page.');
      return;
    }
    const pkce = pkceRef.current;
    if (!pkce) {
      setStatus('Sign-in session expired. Tap Open Google sign-in again.');
      return;
    }
    setBusy(true);
    try {
      setStatus('Exchanging sign-in…');
      const tokenResponse = await fetchWithTimeout(ANTIGRAVITY_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenExchangeBody({ code, verifier: pkce.verifier }),
      });
      if (!tokenResponse.ok) {
        const detail = (await tokenResponse.text()).slice(0, 180);
        throw new Error(`token HTTP ${tokenResponse.status} ${detail}`);
      }
      const token = parseTokenResponse(await tokenResponse.json());

      setStatus('Reading usage…');
      const quota = await loadAntigravityQuota(token.accessToken, (url, init) =>
        fetchWithTimeout(url, init),
      );
      if (quota.windows.length === 0) {
        setBusy(false);
        setStatus(`Connected, but no quota was returned (${quota.detail}).`);
        return;
      }
      setStatus('Saving…');
      await save(quota.windows);
    } catch (error) {
      setBusy(false);
      setStatus(`Sign-in failed: ${message(error)}`);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title="Antigravity" subtitle="Sign in with Google" />
        <Notice tone="info" icon="information-outline">
          Google blocks sign-in inside app WebViews, so DevGauge opens the
          consent page in a browser tab. Your password is never seen by
          DevGauge.
        </Notice>
        <View style={styles.statusRow}>
          {busy ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
            />
          ) : null}
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.body, { color: theme.colors.textSecondary }]}
          >
            {status}
          </Text>
        </View>
        <Button
          label="Open Google sign-in"
          icon="open-in-new"
          onPress={() => void openSignIn()}
          fullWidth
        />
        <View style={styles.form}>
          <Text
            style={[
              typography.labelStrong,
              { color: theme.colors.textPrimary },
            ]}
          >
            Paste the code from the browser
          </Text>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            placeholder="Authorization code"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={[
              typography.monoValue,
              styles.input,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.controlBorder,
                color: theme.colors.textPrimary,
              },
            ]}
          />
          <Button
            label="Submit code"
            icon="check"
            variant="secondary"
            onPress={() => void submit()}
            disabled={pasted.trim() === '' || busy}
          />
        </View>
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  form: { gap: spacing.sm },
  input: {
    minHeight: 88,
    borderWidth: borderWidths.thin,
    borderRadius: radii.control,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
});

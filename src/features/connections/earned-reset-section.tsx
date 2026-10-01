import { useEffect, useRef, useState } from 'react';
import { AppState, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card, Notice, SectionTitle } from '@/components/ui';
import { useTheme } from '@/design/theme-provider';
import { useSyncStatus } from '@/features/dashboard/sync-provider';
import { SESSION_PROVIDERS } from '@/services/web-session/session-config';

/** Browser navigation is a handoff, never proof that an offer exists or was redeemed. */
export function EarnedResetSection({
  providerId,
}: {
  providerId: 'claude' | 'codex';
}) {
  const { theme, typography } = useTheme();
  const { startSync } = useSyncStatus();
  const [state, setState] = useState<
    'idle' | 'opening' | 'checking' | 'returned' | 'failed'
  >('idle');
  const pending = useRef(false);
  const leftApp = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (next) => {
      if (!pending.current) return;
      if (next !== 'active') {
        leftApp.current = true;
        return;
      }
      if (!leftApp.current) return;
      pending.current = false;
      leftApp.current = false;
      setState('checking');
      void startSync(providerId, 'manual').then(
        () => {
          if (mounted.current) setState('returned');
        },
        () => {
          if (mounted.current) setState('failed');
        },
      );
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [providerId, startSync]);
  const provider = SESSION_PROVIDERS[providerId];
  return (
    <Card>
      <SectionTitle>Earned resets</SectionTitle>
      <Text
        style={[typography.bodyStrong, { color: theme.colors.textPrimary }]}
      >
        Availability unknown
      </Text>
      <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
        Earned resets are separate from scheduled usage resets and your local
        reminders. DevGauge cannot verify this account’s offers or apply a reset
        here.
      </Text>
      <Notice tone="info" icon="information-outline">
        {providerId === 'claude'
          ? 'Check the Resets section on Claude web or Desktop. Claude confirms the offered window before you spend an irreversible reset.'
          : 'Check your first-party Codex usage settings for any earned offers. Opening that page does not redeem a reset.'}
      </Notice>
      {state === 'returned' ? (
        <Notice tone="info" icon="information-outline">
          Returned from provider usage. A usage check finished; review the sync
          result above. Earned-reset availability remains unverified.
        </Notice>
      ) : null}
      {state === 'failed' ? (
        <Notice tone="warning" icon="alert-outline">
          Could not open provider usage or check usage on return. Retry the
          handoff or refresh above.
        </Notice>
      ) : null}
      <Button
        label={
          state === 'checking'
            ? 'Checking usage…'
            : `Open ${provider.label} usage (handoff)`
        }
        variant="secondary"
        loading={state === 'opening' || state === 'checking'}
        onPress={async () => {
          if (pending.current || state === 'checking') return;
          pending.current = true;
          leftApp.current = false;
          setState('opening');
          try {
            const result = await WebBrowser.openBrowserAsync(provider.usageUrl);
            if (result.type !== 'opened' && pending.current) {
              pending.current = false;
              if (mounted.current) setState('idle');
            }
          } catch {
            pending.current = false;
            if (mounted.current) setState('failed');
          }
        }}
      />
      {state === 'opening' ? (
        <Button
          label="Check usage after handoff"
          variant="ghost"
          onPress={() => {
            pending.current = false;
            leftApp.current = false;
            setState('checking');
            void startSync(providerId, 'manual').then(
              () => {
                if (mounted.current) setState('returned');
              },
              () => {
                if (mounted.current) setState('failed');
              },
            );
          }}
        />
      ) : null}
    </Card>
  );
}

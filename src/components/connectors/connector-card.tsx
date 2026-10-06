import { StyleSheet, Text, View } from 'react-native';

import {
  allowsConnection,
  describeSource,
  describeState,
} from '@/domain/provider-status';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { formatRelativeMinutes } from '@/utils/format';
import type { ProviderView } from '@/features/dashboard/provider-view-types';
import { Button, Card, StatusChip } from '@/components/ui';
import { ProviderLogo } from '@/components/usage/provider-logo';

export function ConnectorCard({
  provider,
  onConnect,
  onSignIn,
  onOpenUsage,
  onOpenDashboard,
  onDisconnect,
  disconnecting = false,
  testID,
}: {
  provider: ProviderView;
  /** Plain-language auth method, e.g. "Website session in app". */
  authMethod: string;
  /** What usage becomes available after connecting. */
  dataSummary: string;
  /** How long local data is kept. */
  retention: string;
  onConnect?: () => void;
  /** Opens the in-app provider sign-in (embedded session) instead of a browser. */
  onSignIn?: () => void;
  /** Opens the dashboard for an already-connected provider. */
  onOpenUsage?: () => void;
  onOpenDashboard?: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const canConnect = allowsConnection(provider.state);
  const relative = formatRelativeMinutes(provider.updatedMinutesAgo);
  const isConnected =
    provider.state === 'connected' || provider.state === 'stale';
  const hasConnection =
    isConnected ||
    (!!provider.connectionId && provider.state !== 'disconnected');
  const status = describeState(hasConnection ? provider.state : 'disconnected');

  return (
    <Card testID={testID} elevated={isConnected}>
      <View style={styles.headerRow}>
        <ProviderLogo id={provider.id} size={30} />
        <View style={styles.titleBlock}>
          <Text
            style={[typography.bodyStrong, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {provider.displayName}
          </Text>
          <Text
            style={[typography.caption, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {provider.planName
              ? `${provider.planName} · ${describeSource(provider.source)}`
              : describeSource(provider.source)}
          </Text>
        </View>
        <StatusChip
          label={status.label}
          tone={status.tone}
          icon={status.icon}
        />
      </View>

      {relative ? (
        <Text
          style={[typography.monoCaption, { color: theme.colors.textMuted }]}
        >
          Updated {relative}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {hasConnection && onOpenUsage ? (
          <Button
            size="compact"
            label="Open usage"
            icon="chart-timeline-variant"
            onPress={onOpenUsage}
            disabled={disconnecting}
          />
        ) : null}
        {onSignIn ? (
          <Button
            size="compact"
            label="Connect"
            icon="login-variant"
            accessibilityHint="Opens the provider page inside DevGauge"
            onPress={onSignIn}
            disabled={disconnecting}
          />
        ) : null}
        {hasConnection && onDisconnect ? (
          <Button
            size="compact"
            label="Disconnect"
            variant="secondary"
            icon="link-off"
            onPress={onDisconnect}
            loading={disconnecting}
          />
        ) : null}
        {!onSignIn && canConnect && onConnect ? (
          <Button
            size="compact"
            label="Connect"
            variant={isConnected ? 'secondary' : 'primary'}
            icon="link-variant"
            onPress={onConnect}
          />
        ) : null}
        {!onSignIn && provider.state === 'blocked' && onOpenDashboard ? (
          <Button
            size="compact"
            label="Open provider dashboard"
            variant="secondary"
            icon="open-in-new"
            accessibilityHint="Opens the official provider website in your browser"
            onPress={onOpenDashboard}
          />
        ) : null}
        {provider.state === 'candidate-disabled' && !onSignIn ? (
          <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
            {status.hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xxs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

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
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const status = describeState(provider.state);
  const canConnect = allowsConnection(provider.state);
  const relative = formatRelativeMinutes(provider.updatedMinutesAgo);
  const isConnected =
    provider.state === 'connected' || provider.state === 'stale';

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
        {isConnected && onOpenUsage ? (
          <Button
            size="sm"
            label="Open usage"
            icon="chart-timeline-variant"
            onPress={onOpenUsage}
          />
        ) : null}
        {onSignIn ? (
          <Button
            size="sm"
            label={isConnected ? 'Sign in again (in-app)' : 'Sign in (in-app)'}
            icon="login-variant"
            accessibilityHint="Opens the provider page inside DevGauge"
            onPress={onSignIn}
          />
        ) : null}
        {isConnected && onDisconnect ? (
          <Button
            size="sm"
            label="Disconnect"
            variant="secondary"
            icon="link-off"
            onPress={onDisconnect}
          />
        ) : null}
        {!onSignIn && canConnect && onConnect ? (
          <Button
            size="sm"
            label={isConnected ? 'Refresh connection' : 'Connect'}
            variant={isConnected ? 'secondary' : 'primary'}
            icon="link-variant"
            onPress={onConnect}
          />
        ) : null}
        {!onSignIn && provider.state === 'blocked' && onOpenDashboard ? (
          <Button
            size="sm"
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
    gap: spacing.sm,
  },
});

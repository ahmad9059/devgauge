import { StyleSheet, Text, View } from 'react-native';

import {
  allowsConnection,
  describeSource,
  describeState,
} from '@/domain/provider-status';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { formatRelativeMinutes } from '@/utils/format';
import type { ProviderFixture } from '@/testing/fixtures/providers';
import { Button, Card, CardDivider, StatusChip } from '@/components/ui';
import { Monogram } from '@/components/ui/monogram';

export function ConnectorCard({
  provider,
  authMethod,
  dataSummary,
  retention,
  onConnect,
  onOpenDashboard,
  onDisconnect,
  testID,
}: {
  provider: ProviderFixture;
  /** Plain-language auth method, e.g. "Website session in app". */
  authMethod: string;
  /** What usage becomes available after connecting. */
  dataSummary: string;
  /** How long local data is kept. */
  retention: string;
  onConnect?: () => void;
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
        <Monogram label={provider.monogram} />
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

      <CardDivider />

      <View style={styles.facts}>
        <Fact label="Sign-in" value={authMethod} />
        <Fact label="Data" value={dataSummary} />
        <Fact label="Retention" value={retention} />
      </View>

      {provider.note ? (
        <Text
          style={[typography.caption, { color: theme.colors.textSecondary }]}
        >
          {provider.note}
        </Text>
      ) : null}

      {relative ? (
        <Text
          style={[typography.monoCaption, { color: theme.colors.textMuted }]}
        >
          Last updated {relative}
        </Text>
      ) : null}

      <CardDivider />

      <View style={styles.actions}>
        {isConnected && onDisconnect ? (
          <Button
            label="Disconnect"
            variant="secondary"
            icon="link-off"
            onPress={onDisconnect}
          />
        ) : null}
        {canConnect && onConnect ? (
          <Button
            label={isConnected ? 'Refresh connection' : 'Connect'}
            variant={isConnected ? 'secondary' : 'primary'}
            icon="link-variant"
            onPress={onConnect}
          />
        ) : null}
        {provider.state === 'blocked' && onOpenDashboard ? (
          <Button
            label="Open provider dashboard"
            variant="secondary"
            icon="open-in-new"
            accessibilityHint="Opens the provider's own website in your browser"
            onPress={onOpenDashboard}
          />
        ) : null}
        {provider.state === 'candidate-disabled' ? (
          <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
            {status.hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.factRow}>
      <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          typography.label,
          styles.factValue,
          { color: theme.colors.textSecondary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xxs },
  facts: { gap: spacing.sm },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  factValue: { flex: 1, textAlign: 'right' },
  actions: { gap: spacing.sm },
});

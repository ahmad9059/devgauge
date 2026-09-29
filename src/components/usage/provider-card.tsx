import { StyleSheet, Text, View } from 'react-native';

import { describeSource, describeState } from '@/domain/provider-status';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { formatCountdown, formatRelativeMinutes } from '@/utils/format';
import type {
  ProviderFixture,
  UsageWindow,
} from '@/testing/fixtures/providers';
import {
  Card,
  Icon,
  IconButton,
  ProgressBar,
  StatusChip,
} from '@/components/ui';
import { providerIcon } from '@/components/usage/provider-icon';

function progressTone(
  percent: number | undefined,
): 'accent' | 'warning' | 'danger' {
  if (percent === undefined) return 'accent';
  if (percent >= 90) return 'danger';
  if (percent >= 75) return 'warning';
  return 'accent';
}

function windowLabel(window: UsageWindow): string {
  return window.label;
}

/** Reset as a countdown, or the provider's own reset text when unparseable. */
function resetLabel(window: UsageWindow): string | undefined {
  if (window.resetsText) return `Resets ${window.resetsText}`;
  if (window.resetsInMinutes !== undefined) {
    const countdown = formatCountdown(window.resetsInMinutes);
    return countdown ? `Resets in ${countdown}` : undefined;
  }
  return undefined;
}

export function ProviderCard({
  provider,
  onPress,
  onOpenActions,
  testID,
}: {
  provider: ProviderFixture;
  /** Reference instant for reset clock labels. Defaults to load time only if omitted. */
  now?: Date;
  onPress?: () => void;
  onOpenActions?: () => void;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const status = describeState(provider.state);
  const source = describeSource(provider.source);
  const relative = formatRelativeMinutes(provider.updatedMinutesAgo);
  const hasWindows = provider.windows.length > 0;

  const header = (
    <View style={styles.headerRow}>
      <Icon
        name={providerIcon(provider.id)}
        size={22}
        color={theme.colors.textSecondary}
      />
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
          {provider.planName ? `${provider.planName} · ${source}` : source}
        </Text>
      </View>
      <StatusChip label={status.label} tone={status.tone} icon={status.icon} />
    </View>
  );

  const body = hasWindows ? (
    <View style={styles.windows}>
      {provider.windows.map((window) => (
        <ProgressBar
          key={`${provider.id}-${window.kind}-${window.label}`}
          label={windowLabel(window)}
          percent={window.percent}
          used={window.used}
          limit={window.limit}
          unit={window.unit}
          resetsLabel={resetLabel(window)}
          tone={progressTone(window.percent)}
        />
      ))}
    </View>
  ) : null;

  const footer = (
    <View style={styles.footerRow}>
      <Text style={[typography.monoCaption, { color: theme.colors.textMuted }]}>
        {relative ? `Updated ${relative}` : 'No stored snapshot'}
      </Text>
      {onOpenActions ? (
        <IconButton
          icon="dots-horizontal"
          accessibilityLabel={`Actions for ${provider.displayName}`}
          onPress={onOpenActions}
        />
      ) : null}
    </View>
  );

  const accessibilityLabel = [
    provider.displayName,
    provider.planName,
    status.label,
    relative ? `updated ${relative}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card
      testID={testID}
      onPress={onPress}
      elevated={provider.state === 'connected'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Opens provider details' : undefined}
    >
      {header}
      {body}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleBlock: { flex: 1, gap: spacing.xxs },
  windows: { gap: spacing.md },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

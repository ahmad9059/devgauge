import { StyleSheet, Text, View } from 'react-native';

import { describeSource, describeState } from '@/domain/provider-status';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { formatClockTime, formatRelativeMinutes } from '@/utils/format';
import type {
  ProviderFixture,
  UsageWindow,
} from '@/testing/fixtures/providers';
import {
  Card,
  CardDivider,
  IconButton,
  ProgressBar,
  StatusChip,
} from '@/components/ui';
import { Monogram } from '@/components/ui/monogram';

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

export function ProviderCard({
  provider,
  now,
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
          resetsLabel={formatClockTime(
            now ?? new Date(),
            window.resetsInMinutes,
          )}
          tone={progressTone(window.percent)}
        />
      ))}
    </View>
  ) : (
    <Text style={[typography.label, { color: theme.colors.textMuted }]}>
      {status.hint}
    </Text>
  );

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
      <CardDivider />
      {body}
      {provider.note ? (
        <Text
          style={[typography.caption, { color: theme.colors.textSecondary }]}
        >
          {provider.note}
        </Text>
      ) : null}
      <CardDivider />
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

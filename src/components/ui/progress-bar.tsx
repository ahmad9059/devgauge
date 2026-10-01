import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { UsageUnit } from '@/features/dashboard/provider-view-types';
import { clampPercent, formatCount, trim } from '@/utils/format';

/**
 * A thin, monochrome data bar. Color is only used for warning/danger state and
 * is never the sole cue: the exact values are always printed.
 */
export function ProgressBar({
  label,
  percent,
  used,
  limit,
  unit,
  resetsLabel,
  tone = 'accent',
  testID,
}: {
  label: string;
  percent?: number;
  used?: number;
  limit?: number;
  unit?: UsageUnit;
  resetsLabel?: string | null;
  tone?: 'accent' | 'warning' | 'danger';
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const value = clampPercent(percent);
  const fillColor =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'warning'
        ? theme.colors.warning
        : theme.colors.progressFill;

  const hasValues =
    used !== undefined && limit !== undefined && unit !== undefined;
  const valueText =
    percent !== undefined
      ? `${trim(percent)}%`
      : hasValues
        ? formatCount(used, unit)
        : '—';

  return (
    <View
      testID={testID}
      style={styles.wrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(value),
        text: valueText,
      }}
    >
      <View style={styles.labelRow}>
        <Text
          style={[
            typography.label,
            styles.labelText,
            { color: theme.colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            typography.monoLabel,
            styles.valueText,
            { color: theme.colors.textPrimary },
          ]}
        >
          {hasValues
            ? `${formatCount(used, unit)} / ${formatCount(limit, unit)}`
            : valueText}
        </Text>
      </View>
      <View
        style={[styles.track, { backgroundColor: theme.colors.progressTrack }]}
      >
        <View
          style={[
            styles.fill,
            { width: `${value}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      {resetsLabel ? (
        <Text
          style={[typography.monoCaption, { color: theme.colors.textMuted }]}
        >
          {resetsLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  labelText: { flexShrink: 1, maxWidth: '100%' },
  valueText: {
    marginLeft: 'auto',
    flexShrink: 1,
    maxWidth: '100%',
    textAlign: 'right',
  },
  track: { height: 12, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});

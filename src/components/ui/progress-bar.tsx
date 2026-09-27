import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { clampPercent, formatCount, trim } from '@/utils/format';
import type { UsageUnit } from '@/testing/fixtures/providers';

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
        <Text style={[typography.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <Text
          style={[typography.monoLabel, { color: theme.colors.textPrimary }]}
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
            {
              width: `${value}%`,
              backgroundColor: fillColor,
              borderColor: theme.colors.surface,
            },
          ]}
        />
      </View>
      {resetsLabel ? (
        <Text
          style={[typography.monoCaption, { color: theme.colors.textMuted }]}
        >
          Resets in {resetsLabel}
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
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    minWidth: 4,
    borderWidth: 1,
  },
});

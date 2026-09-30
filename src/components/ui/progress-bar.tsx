import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { UsageUnit } from '@/testing/fixtures/providers';
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
  const { theme, typography, reduceMotion } = useTheme();
  const value = clampPercent(percent);
  const [fill] = useState(() => new Animated.Value(value / 100));
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: value / 100,
      duration: reduceMotion ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, value, reduceMotion]);
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
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: theme.colors.progressTrack }]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: '100%',
              backgroundColor: fillColor,
              transform: [
                {
                  translateX: fill.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-trackWidth / 2, 0],
                  }),
                },
                { scaleX: fill },
              ],
            },
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
  },
  track: { height: 12, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});

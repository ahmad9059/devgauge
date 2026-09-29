import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '@/design/themes';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { IconName } from './icon';

/**
 * Status is a small colored dot plus a text label. Meaning is carried by the
 * label, not by an icon tile, pill, or color alone.
 */
export function StatusChip({
  label,
  tone,
  testID,
}: {
  label: string;
  tone: StatusTone;
  /** Accepted for call-site compatibility; no decorative icon is rendered. */
  icon?: IconName;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const color = theme.tones[tone].content;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Status: ${label}`}
      style={styles.row}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[typography.caption, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

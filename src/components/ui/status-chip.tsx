import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '@/design/themes';
import { borderWidths, radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Icon, type IconName } from './icon';

/**
 * Status is communicated by icon + text, never by color alone. The tone only
 * reinforces meaning.
 */
export function StatusChip({
  label,
  tone,
  icon,
  testID,
}: {
  label: string;
  tone: StatusTone;
  icon: IconName;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const toneColors = theme.tones[tone];
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Status: ${label}`}
      style={[
        styles.chip,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border,
        },
      ]}
    >
      <Icon name={icon} size={14} color={toneColors.content} />
      <Text style={[typography.caption, { color: toneColors.content }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: borderWidths.thin,
    alignSelf: 'flex-start',
  },
});

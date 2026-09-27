import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '@/design/themes';
import { borderWidths, radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Icon, type IconName } from './icon';

/** Inline explanatory banner. Icon + text always accompany the tone color. */
export function Notice({
  tone = 'info',
  icon = 'information-outline',
  children,
  testID,
}: {
  tone?: StatusTone;
  icon?: IconName;
  children: string;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const toneColors = theme.tones[tone];
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={children}
      style={[
        styles.container,
        {
          backgroundColor: toneColors.background,
          borderColor: toneColors.border,
        },
      ]}
    >
      <Icon name={icon} size={16} color={toneColors.content} />
      <Text
        style={[typography.caption, styles.text, { color: toneColors.content }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.control,
    borderWidth: borderWidths.thin,
  },
  text: { flex: 1 },
});

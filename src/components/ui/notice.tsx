import { StyleSheet, Text, View } from 'react-native';

import type { StatusTone } from '@/design/themes';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import type { IconName } from './icon';

/**
 * Inline explanatory note. A thin tone rule carries the category; the text is
 * the message. No filled color field or decorative icon.
 */
export function Notice({
  tone = 'info',
  children,
  testID,
}: {
  tone?: StatusTone;
  /** Accepted for call-site compatibility; no decorative icon is rendered. */
  icon?: IconName;
  children: string;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const color = theme.tones[tone].content;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={children}
      style={[styles.container, { borderLeftColor: color }]}
    >
      <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xxs,
  },
});

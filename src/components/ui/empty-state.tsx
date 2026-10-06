import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Icon, type IconName } from './icon';

export function EmptyState({
  icon,
  title,
  description,
  action,
  iconSize = 20,
  testID,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  iconSize?: number;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  return (
    <View testID={testID} style={styles.container}>
      <Icon name={icon} size={iconSize} color={theme.colors.textMuted} />
      <Text
        accessibilityRole="header"
        style={[
          typography.subheading,
          styles.center,
          { color: theme.colors.textPrimary },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          styles.center,
          { color: theme.colors.textSecondary },
        ]}
      >
        {description}
      </Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.sm },
});

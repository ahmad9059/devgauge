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
  testID,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  return (
    <View testID={testID} style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.surfaceRaised },
        ]}
      >
        <Icon name={icon} size={28} color={theme.colors.textSecondary} />
      </View>
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
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  center: { textAlign: 'center' },
  action: { marginTop: spacing.sm },
});

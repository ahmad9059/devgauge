import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Button } from './button';
import { Icon } from './icon';

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  testID,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  return (
    <View testID={testID} style={styles.container} accessibilityRole="alert">
      <Icon name="alert-circle-outline" size={28} color={theme.colors.danger} />
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
      {onRetry ? (
        <Button
          label={retryLabel}
          variant="secondary"
          icon="refresh"
          onPress={onRetry}
        />
      ) : null}
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
});

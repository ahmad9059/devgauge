import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

export function AppErrorBoundary({ retry }: { retry: () => void }) {
  const { theme, typography } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text
        accessibilityRole="header"
        style={[
          typography.heading,
          styles.center,
          { color: theme.colors.textPrimary },
        ]}
      >
        Something went wrong
      </Text>
      <Text
        style={[
          typography.body,
          styles.center,
          { color: theme.colors.textSecondary },
        ]}
      >
        This screen could not be displayed.
      </Text>
      <Button label="Try again" icon="refresh" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  center: { textAlign: 'center' },
});

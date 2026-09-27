import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/design/tokens';
import { useResponsiveLayout } from '@/design/use-responsive-layout';
import { useTheme } from '@/design/theme-provider';

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  testID,
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      testID={testID}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      {children}
    </SafeAreaView>
  );
}

export function ScreenScroll({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps & { children: ReactNode }) {
  const { contentMaxWidth } = useResponsiveLayout();
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        contentMaxWidth > 0 && {
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function Stack({
  children,
  gap = 'lg',
  style,
}: {
  children: ReactNode;
  gap?: keyof typeof spacing;
  style?: View['props']['style'];
}) {
  return (
    <View style={[styles.flex, { gap: spacing[gap] }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});

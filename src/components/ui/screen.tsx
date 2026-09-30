import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
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
  const { theme, reduceMotion } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);
  return (
    <SafeAreaView
      edges={edges}
      testID={testID}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Animated.View style={[styles.flex, { opacity }]}>
        {children}
      </Animated.View>
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

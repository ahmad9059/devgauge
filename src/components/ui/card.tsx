import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { MotionPressable as Pressable } from './motion-pressable';

import { borderWidths, radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  elevated = false,
  padded = true,
  style,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  elevated?: boolean;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}) {
  const { theme } = useTheme();
  const backgroundColor = elevated
    ? theme.colors.surfaceElevated
    : theme.colors.surface;
  const base: ViewStyle = {
    backgroundColor,
    borderColor: theme.colors.border,
    borderWidth: borderWidths.thin,
    borderRadius: radii.card,
    padding: padded ? spacing.lg : 0,
    gap: spacing.md,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={[base, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: theme.colors.surfaceRaised }}
      style={({ pressed }) => [base, style, pressed && { opacity: 0.92 }]}
    >
      {children}
    </Pressable>
  );
}

export function CardDivider() {
  const { theme } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
  );
}

const styles = StyleSheet.create({
  divider: { height: borderWidths.thin, width: '100%' },
});

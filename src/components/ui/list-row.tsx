import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderWidths, radii, spacing, touchTargets } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Icon } from './icon';

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  showChevron = false,
  destructive = false,
  selected = false,
  testID,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  showChevron?: boolean;
  destructive?: boolean;
  selected?: boolean;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  const titleColor = destructive
    ? theme.colors.danger
    : theme.colors.textPrimary;

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.text}>
        <Text style={[typography.body, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron ? (
        <Icon name="chevron-right" size={22} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        style={[
          styles.row,
          selected && { backgroundColor: theme.colors.surfaceRaised },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      android_ripple={{ color: theme.colors.surfaceRaised }}
      style={({ pressed }) => [
        styles.row,
        selected && { backgroundColor: theme.colors.surfaceRaised },
        pressed && { opacity: 0.9 },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTargets.comfortable,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.control,
  },
  leading: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: spacing.xxs },
  trailing: { alignItems: 'flex-end' },
  divider: { height: borderWidths.thin, marginLeft: spacing.xs },
});

export function RowDivider() {
  const { theme } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
  );
}

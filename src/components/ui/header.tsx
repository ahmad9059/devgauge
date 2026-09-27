import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme-provider';

export function Header({
  title,
  subtitle,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  testID?: string;
}) {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.text}>
        <Text
          accessibilityRole="header"
          style={[typography.title, { color: theme.colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.label, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

export function SectionTitle({
  children,
  caption,
}: {
  children: string;
  caption?: string;
}) {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[typography.subheading, { color: theme.colors.textPrimary }]}
      >
        {children}
      </Text>
      {caption ? (
        <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
          {caption.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: { flexShrink: 1, gap: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { gap: 4 },
});

import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/design/theme-provider';

/**
 * Brand-neutral identifier text. Deliberately not a logo, tile, or badge.
 */
export function Monogram({
  label,
  size = 40,
}: {
  label: string;
  size?: number;
}) {
  const { theme, typography } = useTheme();
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.label,
        typography.monoLabel,
        {
          color: theme.colors.textSecondary,
          fontSize: Math.min(Math.round(size * 0.3), 15),
          lineHeight: Math.min(Math.round(size * 0.38), 18),
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { textTransform: 'uppercase' },
});

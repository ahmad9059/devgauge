import { StyleSheet, Text, View } from 'react-native';

import { radii } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

/**
 * Neutral monogram used until official provider brand assets are approved.
 * Deliberately not a company logo or trademark.
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
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: radii.control,
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          typography.monoLabel,
          {
            color: theme.colors.textPrimary,
            fontSize: size * 0.34,
            lineHeight: size * 0.44,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

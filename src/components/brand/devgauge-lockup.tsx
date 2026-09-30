import { Image, StyleSheet, Text, View } from 'react-native';

import { radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

const mark = require('../../../assets/adaptive-icon.png');

/** The product lockup used in app chrome; native launcher assets share this mark. */
export function DevGaugeLockup() {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header">
      <View
        style={[
          styles.mark,
          {
            backgroundColor:
              theme.scheme === 'dark'
                ? theme.colors.surfaceSunken
                : theme.colors.textPrimary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Image
          source={mark}
          accessibilityLabel="DevGauge"
          style={styles.image}
        />
      </View>
      <Text style={[typography.heading, { color: theme.colors.textPrimary }]}>
        DevGauge
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 42, height: 42 },
});

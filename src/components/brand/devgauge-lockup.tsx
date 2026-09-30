import { Image, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

const mark = require('../../../assets/adaptive-icon.png');

/** The product lockup used in app chrome; native launcher assets share this mark. */
export function DevGaugeLockup() {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header">
      <Image source={mark} accessibilityLabel="DevGauge" style={styles.image} />
      <Text style={[typography.heading, { color: theme.colors.textPrimary }]}>
        DevGauge
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  image: { width: 44, height: 44 },
});

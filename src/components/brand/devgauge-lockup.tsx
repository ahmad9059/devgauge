import { Image, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

const mark = require('../../../assets/adaptive-icon.png');
const MARK_SIZE = 36;
// The adaptive artwork occupies 620 of its 1024 pixels; app chrome omits the
// launcher's transparent safe-zone padding so the visible mark matches providers.
const IMAGE_SIZE = (MARK_SIZE * 1024) / 620;
// Implemented by RN's Android image manager; its current TS props omit this key.
const qualityProps = { resizeMultiplier: 2 };

/** The product lockup used in app chrome; native launcher assets share this mark. */
export function DevGaugeLockup() {
  const { theme, typography } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="header">
      <View style={styles.mark}>
        <Image
          source={mark}
          accessibilityLabel="DevGauge"
          style={[styles.image, { tintColor: theme.colors.textPrimary }]}
          resizeMode="contain"
          resizeMethod="resize"
          {...qualityProps}
        />
      </View>
      <Text style={[typography.heading, { color: theme.colors.textPrimary }]}>
        DevGauge
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, flexShrink: 0 },
});

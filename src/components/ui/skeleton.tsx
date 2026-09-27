import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { radii } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  testID,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: keyof typeof radii;
  testID?: string;
}) {
  const { theme, reduceMotion } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radii[radius],
          backgroundColor: theme.colors.skeleton,
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
});

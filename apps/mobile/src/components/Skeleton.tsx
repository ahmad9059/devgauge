import { useEffect, useState } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height: number;
  radius?: "sm" | "md" | "lg" | "pill";
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height, radius = "md", style }: SkeletonProps): React.JSX.Element {
  const { theme, reduceMotion } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.65);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: theme.radius[radius],
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}
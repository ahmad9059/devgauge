import { useState } from 'react';
import { Animated, Pressable, type PressableProps } from 'react-native';
import { useTheme } from '@/design/theme-provider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Shared, native-driven tactile feedback for every app action. */
export function MotionPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const { reduceMotion } = useTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const settle = (value: number) => {
    Animated.spring(scale, {
      toValue: reduceMotion ? 1 : value,
      stiffness: 400,
      damping: 30,
      mass: 0.5,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  };
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        settle(0.98);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        settle(1);
        onPressOut?.(event);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        { transform: [{ scale }] },
      ]}
    />
  );
}

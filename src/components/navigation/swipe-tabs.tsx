import { useMemo, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { swipeDestination } from './swipe-destination';

export function SwipeTabs({
  children,
  tab,
  navigate,
}: {
  children: ReactNode;
  tab: string;
  navigate: (tab: string) => void;
}) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        // Let taps and vertical ScrollViews retain their normal responders.
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.numberActiveTouches === 1 &&
          Math.abs(gesture.dx) > 24 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
        onPanResponderRelease: (_, gesture) => {
          const destination = swipeDestination(tab, gesture.dx, gesture.dy);
          if (destination) navigate(destination);
        },
      }),
    [tab, navigate],
  );
  return (
    <View style={styles.screen} {...responder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });

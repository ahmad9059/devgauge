import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui';
import { ProviderLogo } from './provider-logo';
import {
  borderWidths,
  opacities,
  radii,
  spacing,
  touchTargets,
} from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { useSyncStatus } from '@/features/dashboard/sync-provider';

/** Idle: Sync All. While working: one completed provider + rotating refresh. */
export function SyncControl() {
  const { theme, reduceMotion } = useTheme();
  const { isSyncing, displayedProviderId, syncingProviderIds, startSync } =
    useSyncStatus();
  const [expansion] = useState(() => new Animated.Value(0));
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      expansion.stopAnimation();
      expansion.setValue(isSyncing ? 1 : 0);
      return;
    }
    Animated.timing(expansion, {
      toValue: isSyncing ? 1 : 0,
      duration: isSyncing ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expansion, isSyncing, reduceMotion]);

  useEffect(() => {
    rotation.setValue(0);
    if (!isSyncing || reduceMotion) return;
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [isSyncing, rotation, reduceMotion]);

  const width = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [touchTargets.iconButton, 104],
  });

  return (
    <Animated.View
      style={[
        styles.frame,
        {
          width,
          backgroundColor: isSyncing
            ? theme.colors.surfaceElevated
            : 'transparent',
          borderColor: isSyncing ? theme.colors.border : 'transparent',
          borderWidth: isSyncing ? borderWidths.thin : 0,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isSyncing
            ? `Syncing ${syncingProviderIds.length} providers`
            : 'Refresh all providers'
        }
        accessibilityState={{ disabled: isSyncing, busy: isSyncing }}
        disabled={isSyncing}
        onPress={() => void startSync().catch(() => undefined)}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed && !isSyncing ? opacities.pressed : 1 },
        ]}
      >
        {isSyncing && displayedProviderId ? (
          <ProviderLogo id={displayedProviderId} size={28} />
        ) : null}
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Icon name="refresh" size={24} color={theme.colors.accent} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: touchTargets.iconButton,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    minHeight: touchTargets.iconButton,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
});

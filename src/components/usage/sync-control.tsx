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

/** Idle: Sync All. While working: provider logo + the same rotating refresh icon. */
export function SyncControl() {
  const { theme } = useTheme();
  const { isSyncing, providerName, providerId, startSync } = useSyncStatus();
  const [expansion] = useState(() => new Animated.Value(0));
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(expansion, {
      toValue: isSyncing ? 1 : 0,
      duration: isSyncing ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expansion, isSyncing]);

  useEffect(() => {
    rotation.setValue(0);
    if (!isSyncing) return;
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
  }, [isSyncing, rotation]);

  const width = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [touchTargets.iconButton, 80],
  });

  return (
    <Animated.View
      style={[
        styles.frame,
        {
          width,
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isSyncing
            ? `Syncing ${providerName ?? 'provider'}`
            : 'Refresh all providers'
        }
        accessibilityState={{ disabled: isSyncing, busy: isSyncing }}
        disabled={isSyncing}
        onPress={() => void startSync()}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed && !isSyncing ? opacities.pressed : 1 },
        ]}
      >
        {isSyncing && providerId ? (
          <ProviderLogo id={providerId} size={24} />
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
          <Icon name="refresh" size={20} color={theme.colors.accent} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: touchTargets.iconButton,
    borderRadius: radii.pill,
    borderWidth: borderWidths.thin,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    minHeight: touchTargets.iconButton,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

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
import type { ProviderId } from '@/domain/providers';

function CompletionLogo({ id }: { id: ProviderId }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <ProviderLogo id={id} size={28} />
    </Animated.View>
  );
}

/** Idle: Sync All. While working: provider logo + the same rotating refresh icon. */
export function SyncControl() {
  const { theme, reduceMotion } = useTheme();
  const { isSyncing, displayedProviderId, syncingProviderIds, startSync } =
    useSyncStatus();
  const [expansion] = useState(() => new Animated.Value(0));
  const [rotation] = useState(() => new Animated.Value(0));
  const [pressScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.timing(expansion, {
      toValue: isSyncing ? 1 : 0,
      duration: reduceMotion ? 0 : isSyncing ? 180 : 140,
      easing: isSyncing ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
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

  const scaleX = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [touchTargets.iconButton / 104, 1],
  });

  return (
    <Animated.View
      style={[
        styles.frame,
        {
          transform: [{ scale: pressScale }],
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.pill,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            opacity: expansion,
            transform: [
              {
                translateX: expansion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
              { scaleX },
            ],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isSyncing
            ? `Syncing ${syncingProviderIds.length} provider${syncingProviderIds.length === 1 ? '' : 's'}`
            : 'Refresh all providers'
        }
        accessibilityState={{ disabled: isSyncing, busy: isSyncing }}
        disabled={isSyncing}
        onPress={() => void startSync()}
        onPressIn={() =>
          Animated.spring(pressScale, {
            toValue: reduceMotion ? 1 : 0.96,
            stiffness: 400,
            damping: 30,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(pressScale, {
            toValue: 1,
            stiffness: 400,
            damping: 30,
            useNativeDriver: true,
          }).start()
        }
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed && !isSyncing ? opacities.pressed : 1 },
        ]}
      >
        {isSyncing && displayedProviderId ? (
          <CompletionLogo key={displayedProviderId} id={displayedProviderId} />
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
    width: 104,
    height: touchTargets.iconButton,
  },
  pill: {
    borderRadius: radii.pill,
    borderWidth: borderWidths.thin,
  },
  pressable: {
    flex: 1,
    minHeight: touchTargets.iconButton,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xl,
  },
});

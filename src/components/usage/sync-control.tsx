import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui';
import {
  borderWidths,
  opacities,
  radii,
  spacing,
  touchTargets,
} from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { useSyncStatus } from '@/features/dashboard/sync-provider';

/** Idle: a compact Sync All icon. While working: provider name + live spinner. */
export function SyncControl() {
  const { theme, typography } = useTheme();
  const { isSyncing, providerName, startSync } = useSyncStatus();
  const [expansion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(expansion, {
      toValue: isSyncing ? 1 : 0,
      duration: isSyncing ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expansion, isSyncing]);

  const width = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [touchTargets.iconButton, 190],
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
        {isSyncing ? (
          <Text
            numberOfLines={1}
            style={[
              typography.labelStrong,
              styles.label,
              { color: theme.colors.textPrimary },
            ]}
          >
            {providerName ?? 'Syncing'}
          </Text>
        ) : null}
        {isSyncing ? (
          <ActivityIndicator color={theme.colors.accent} size="small" />
        ) : (
          <Icon name="refresh" size={20} color={theme.colors.accent} />
        )}
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
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: { flex: 1, textAlign: 'left' },
});

import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderWidths, radii, spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { IconButton } from './button';

export function Sheet({
  visible,
  title,
  onClose,
  children,
  testID,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}) {
  const { theme, typography, reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible) setMounted(true);
      Animated.timing(progress, {
        toValue: visible ? 1 : 0,
        duration: reduceMotion ? 0 : visible ? 200 : 140,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !visible) setMounted(false);
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [visible, reduceMotion, progress]);
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: theme.colors.overlay, opacity: progress },
        ]}
      >
        <Pressable
          style={styles.backdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheetWrapper}>
          <Animated.View
            testID={testID}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                transform: [
                  {
                    translateY: reduceMotion
                      ? 0
                      : progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [24, 0],
                        }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.header}>
              <Text
                accessibilityRole="header"
                style={[
                  typography.heading,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {title}
              </Text>
              <IconButton
                icon="close"
                accessibilityLabel="Close"
                onPress={onClose}
              />
            </View>
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropPress: { flex: 1 },
  sheetWrapper: { width: '100%' },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: borderWidths.thin,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  body: { gap: spacing.md },
});

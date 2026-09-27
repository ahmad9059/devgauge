import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      >
        <Pressable
          style={styles.backdropPress}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.sheetWrapper}>
          <View
            testID={testID}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
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
          </View>
        </SafeAreaView>
      </View>
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

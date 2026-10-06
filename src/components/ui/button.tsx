import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import {
  borderWidths,
  opacities,
  radii,
  spacing,
  touchTargets,
} from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { Icon, type IconName } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'sm' | 'md' | 'lg';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  accessibilityHint,
  fullWidth = false,
  testID,
  style: customStyle,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  accessibilityHint?: string;
  fullWidth?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const { theme, typography } = useTheme();
  const inactive = disabled || loading;
  const compact = size === 'compact';
  const minHeight = compact
    ? 31
    : size === 'lg'
      ? touchTargets.comfortable
      : size === 'sm'
        ? 44
        : touchTargets.minimum;
  const paddingVertical = compact
    ? spacing.xxs
    : size === 'sm'
      ? spacing.xs
      : spacing.sm;
  const paddingHorizontal = compact
    ? 9
    : size === 'sm'
      ? spacing.md
      : spacing.lg;

  const palette: Record<
    ButtonVariant,
    { background: string; border: string; text: string }
  > = {
    primary: {
      background: theme.colors.accent,
      border: theme.colors.accent,
      text: theme.colors.accentContrast,
    },
    secondary: {
      background: theme.colors.surfaceElevated,
      border: theme.colors.controlBorder,
      text: theme.colors.textPrimary,
    },
    ghost: {
      background: 'transparent',
      border: 'transparent',
      text: theme.colors.accent,
    },
    danger: {
      background: theme.colors.dangerFill,
      border: theme.colors.dangerFill,
      text: theme.colors.dangerContrast,
    },
  };
  const colors = palette[variant];

  const style = ({ pressed }: { pressed: boolean }): ViewStyle => ({
    minHeight,
    minWidth: compact ? touchTargets.minimum : undefined,
    paddingVertical,
    paddingHorizontal,
    borderRadius: radii.control,
    borderWidth: borderWidths.thin,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: compact ? 6 : spacing.sm,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: inactive ? opacities.disabled : pressed ? opacities.pressed : 1,
    ...customStyle,
  });

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      hitSlop={compact ? { top: 9, bottom: 9, left: 0, right: 0 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : icon ? (
        <Icon name={icon} size={compact ? 14 : 20} color={colors.text} />
      ) : null}
      <Text
        style={[
          typography.labelStrong,
          compact ? { fontSize: 12, lineHeight: 17 } : undefined,
          { color: colors.text, flexShrink: 1, textAlign: 'center' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  testID,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      android_ripple={{ color: theme.colors.surfaceRaised, borderless: true }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          opacity: disabled
            ? opacities.disabled
            : pressed
              ? opacities.pressed
              : 1,
        },
      ]}
    >
      <Icon name={icon} size={24} color={theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: touchTargets.iconButton,
    height: touchTargets.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
  },
});

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ColorValue } from 'react-native';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Single vector icon family for the whole app. Navigation and status never use
 * emoji, and labels always accompany the icon for screen readers.
 */
export function Icon({
  name,
  size,
  color,
  accessibilityHidden = true,
}: {
  name: IconName;
  size: number;
  color: ColorValue;
  accessibilityHidden?: boolean;
}) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden={accessibilityHidden}
      importantForAccessibility={
        accessibilityHidden ? 'no-hide-descendants' : 'yes'
      }
    />
  );
}

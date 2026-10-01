import { Text } from 'react-native';

import { useTheme } from '@/design/theme-provider';

/** Text-only product heading in app chrome. */
export function DevGaugeLockup() {
  const { theme, typography } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[typography.heading, { color: theme.colors.textPrimary }]}
    >
      DevGauge
    </Text>
  );
}

import { TopTabs } from 'expo-router/js-top-tabs';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { touchTargets } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

export default function TabLayout() {
  const { theme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();

  return (
    <TopTabs
      initialRouteName="usage"
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        tabBarShowIcon: true,
        tabBarIndicatorStyle: { height: 0 },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          elevation: 0,
          shadowOpacity: 0,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          height:
            Math.max(
              touchTargets.tabBar,
              (typography.caption.lineHeight ?? 20) * fontScale + 40,
            ) + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: typography.caption,
        tabBarItemStyle: { minHeight: touchTargets.minimum, padding: 0 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <TopTabs.Screen
        name="usage"
        options={{
          title: 'Usage',
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon
              name="chart-timeline-variant"
              size={24}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
      <TopTabs.Screen
        name="connectors"
        options={{
          title: 'Connectors',
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon
              name="connection"
              size={24}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
      <TopTabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }: { color: string }) => (
            <Icon
              name="cog-outline"
              size={24}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
    </TopTabs>
  );
}

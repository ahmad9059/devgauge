import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui';
import { SwipeTabs } from '@/components/navigation/swipe-tabs';
import { touchTargets } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';

export default function TabLayout() {
  const { theme, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenLayout={({ children, route, navigation }) => (
        <SwipeTabs tab={route.name} navigate={navigation.navigate}>
          {children}
        </SwipeTabs>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          height: touchTargets.tabBar + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: typography.caption,
        tabBarItemStyle: { minHeight: touchTargets.minimum },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="usage"
        options={{
          title: 'Usage',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="chart-timeline-variant"
              size={size}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="connectors"
        options={{
          title: 'Connectors',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="connection"
              size={size}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon
              name="cog-outline"
              size={size}
              color={color}
              accessibilityHidden={false}
            />
          ),
        }}
      />
    </Tabs>
  );
}

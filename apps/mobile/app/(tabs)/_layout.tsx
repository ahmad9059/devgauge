import { Redirect, Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "../../src/theme";
import { useAuth } from "../../src/auth/AuthContext";

export default function TabsLayout(): React.JSX.Element {
  const { theme } = useTheme();
  const { status } = useAuth();
  const color = theme.colors;

  if (status === "signedOut") {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Usage",
          tabBarIcon: ({ color: c, size }) => <Ionicons name="speedometer-outline" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="connectors"
        options={{
          title: "Connectors",
          tabBarIcon: ({ color: c, size }) => <Ionicons name="link-outline" color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color: c, size }) => <Ionicons name="settings-outline" color={c} size={size} />,
        }}
      />
    </Tabs>
  );
}
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider, useTheme } from "../src/theme";
import { AuthProvider } from "../src/auth/AuthContext";

function RootNavigator(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
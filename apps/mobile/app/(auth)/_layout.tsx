import { Redirect, Stack } from "expo-router";

import { useTheme } from "../../src/theme";
import { useAuth } from "../../src/auth/AuthContext";

export default function AuthLayout(): React.JSX.Element {
  const { status } = useAuth();
  const { theme } = useTheme();

  if (status === "signedIn") {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    />
  );
}
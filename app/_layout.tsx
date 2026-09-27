import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppErrorBoundary } from '@/components/app-error-boundary';
import { ThemeProvider, useTheme } from '@/design/theme-provider';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <AppErrorBoundary retry={retry} />;
}

function ThemedApp() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Welcome' }} />
        <Stack.Screen
          name="provider/[providerId]"
          options={{ title: 'Provider' }}
        />
        <Stack.Screen
          name="connect/[providerId]"
          options={{ title: 'Connect' }}
        />
        <Stack.Screen name="legal/[document]" options={{ title: 'Legal' }} />
        <Stack.Screen name="support" options={{ title: 'Support' }} />
        <Stack.Screen name="diagnostics" options={{ title: 'Diagnostics' }} />
        <Stack.Screen
          name="auth/callback/[providerId]"
          options={{ title: 'Authorization' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

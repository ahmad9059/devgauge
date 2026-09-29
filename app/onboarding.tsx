import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Header,
  ListRow,
  Notice,
  Screen,
  ScreenScroll,
} from '@/components/ui';
import { Monogram } from '@/components/ui/monogram';
import { useTheme } from '@/design/theme-provider';

const STEPS = [
  {
    title: 'Connect a coding agent',
    subtitle:
      'Claude, Codex, Command Code, OpenCode Go, GitHub Copilot, and Antigravity CLI.',
  },
  {
    title: 'See every window',
    subtitle:
      'Rolling, daily, weekly, monthly, and billing-period limits in one place.',
  },
  {
    title: 'Keep it on your device',
    subtitle:
      'Usage history stays local; nothing is uploaded to a DevGauge account.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, typography } = useTheme();
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <View style={styles.hero}>
          <Monogram label="DG" size={64} />
          <Header
            title="Welcome to DevGauge"
            subtitle="A local-first usage dashboard for coding agents"
          />
        </View>

        <Notice tone="info" icon="shield-lock-outline">
          No sign-up required. DevGauge stores usage data on this device only.
        </Notice>

        {STEPS.map((step) => (
          <Card key={step.title}>
            <Text
              style={[
                typography.bodyStrong,
                { color: theme.colors.textPrimary },
              ]}
            >
              {step.title}
            </Text>
            <Text
              style={[typography.body, { color: theme.colors.textSecondary }]}
            >
              {step.subtitle}
            </Text>
          </Card>
        ))}

        <ListRow title="Android only" subtitle="DevGauge runs on Android." />

        <Button
          label="Go to the dashboard"
          icon="arrow-right"
          fullWidth
          onPress={() => router.replace('/(tabs)/usage')}
        />
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 16 },
});

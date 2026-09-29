import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Card,
  Header,
  ListRow,
  Notice,
  Screen,
  ScreenScroll,
  SectionTitle,
} from '@/components/ui';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import { useTheme } from '@/design/theme-provider';

export default function DiagnosticsScreen() {
  const router = useRouter();
  const { theme, typography } = useTheme();

  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;

  const appVariant = Constants.expoConfig?.extra?.appVariant ?? 'unknown';
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title="Diagnostics" subtitle="Internal test builds only" />
        <Notice tone="warning" icon="wrench-outline">
          Hidden in production builds even if the preview flag is present.
        </Notice>

        <SectionTitle>Feasibility tools</SectionTitle>
        <Card padded={false}>
          <View>
            <ListRow
              title="Android WebView feasibility"
              subtitle="Open official provider pages with test accounts"
              showChevron
              onPress={() => router.push('/diagnostics/web-session')}
            />
            <ListRow
              title="Design system gallery"
              subtitle="Every provider and component state, both themes"
              showChevron
              onPress={() => router.push('/diagnostics/design-system')}
            />
            <ListRow
              title="Local storage self-test"
              subtitle="SQLCipher, migrations, and repository round-trip"
              showChevron
              onPress={() => router.push('/diagnostics/storage')}
            />
            <ListRow
              title="Demo connector"
              subtitle="Run the real pipeline with sample data"
              showChevron
              onPress={() => router.push('/diagnostics/demo-connector')}
            />
          </View>
        </Card>

        <SectionTitle>Build</SectionTitle>
        <Card>
          <Text
            style={[typography.monoLabel, { color: theme.colors.textPrimary }]}
          >
            DevGauge {version}
          </Text>
          <Text
            style={[
              typography.monoLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            Variant: {appVariant}
          </Text>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}

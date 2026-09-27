import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ConnectorCard } from '@/components/connectors/connector-card';
import { ProviderCard } from '@/components/usage/provider-card';
import {
  Button,
  Card,
  Header,
  Notice,
  ProgressBar,
  Screen,
  ScreenScroll,
  SectionTitle,
  Skeleton,
  Stack,
  StatusChip,
} from '@/components/ui';
import { diagnosticsEnabled } from '@/config/diagnostics-runtime';
import { useTheme } from '@/design/theme-provider';
import { describeState } from '@/domain/provider-status';
import {
  connectorMetadata,
  stateShowcase,
  type ProviderState,
} from '@/testing/fixtures/providers';

const ALL_STATES: ProviderState[] = [
  'connected',
  'disconnected',
  'candidate-disabled',
  'experimental',
  'blocked',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];

function DesignSystemGallery() {
  const { theme, preference, setPreference } = useTheme();

  return (
    <Screen>
      <ScreenScroll>
        <Header
          title="Design system"
          subtitle="Static component and state gallery"
        />

        <Notice tone="info" icon="palette-outline">
          Switch themes here to check contrast, both palettes, and every
          provider state.
        </Notice>

        <Button
          label={`Theme: ${preference}`}
          variant="secondary"
          icon="theme-light-dark"
          onPress={() =>
            setPreference(
              preference === 'dark'
                ? 'light'
                : preference === 'light'
                  ? 'system'
                  : 'dark',
            )
          }
        />

        <SectionTitle>Status chips</SectionTitle>
        <Card>
          <View style={styles.wrap}>
            {ALL_STATES.map((state) => {
              const status = describeState(state);
              return (
                <StatusChip
                  key={state}
                  label={status.label}
                  tone={status.tone}
                  icon={status.icon}
                />
              );
            })}
          </View>
        </Card>

        <SectionTitle>Progress bars</SectionTitle>
        <Card>
          <ProgressBar
            label="Low"
            percent={12}
            used={12}
            limit={100}
            unit="percent"
            resetsLabel="3h"
          />
          <ProgressBar
            label="High"
            percent={82}
            used={82}
            limit={100}
            unit="percent"
            tone="warning"
            resetsLabel="45m"
          />
          <ProgressBar
            label="Critical"
            percent={96}
            used={96}
            limit={100}
            unit="percent"
            tone="danger"
            resetsLabel="5m"
          />
          <ProgressBar label="Unknown" unit="credits" />
        </Card>

        <SectionTitle>Loading</SectionTitle>
        <Card>
          <Stack gap="sm">
            <Skeleton height={20} width="60%" />
            <Skeleton height={12} />
            <Skeleton height={12} width="80%" />
          </Stack>
        </Card>

        <SectionTitle>Every provider state</SectionTitle>
        <Stack gap="lg">
          {stateShowcase.map((provider, index) => (
            <ProviderCard
              key={`${provider.id}-${provider.state}-${index}`}
              provider={provider}
            />
          ))}
        </Stack>

        <SectionTitle>Connector cards</SectionTitle>
        <Stack gap="lg">
          {stateShowcase.slice(0, 4).map((provider, index) => (
            <ConnectorCard
              key={`connector-${provider.id}-${provider.state}-${index}`}
              provider={provider}
              authMethod={connectorMetadata[provider.id].authMethod}
              dataSummary={connectorMetadata[provider.id].dataSummary}
              retention={connectorMetadata[provider.id].retention}
              onConnect={() => undefined}
              onOpenDashboard={
                provider.dashboardUrl ? () => undefined : undefined
              }
              onDisconnect={() => undefined}
            />
          ))}
        </Stack>

        <Text style={[styles.footer, { color: theme.colors.textMuted }]}>
          Scheme: {theme.scheme}
        </Text>
      </ScreenScroll>
    </Screen>
  );
}

export default function DesignSystemRoute() {
  if (!diagnosticsEnabled) return <Redirect href="/(tabs)/settings" />;
  return <DesignSystemGallery />;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { textAlign: 'center' },
});

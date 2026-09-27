import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Linking } from 'react-native';

import { ConnectorCard } from '@/components/connectors/connector-card';
import {
  Header,
  Notice,
  Screen,
  ScreenScroll,
  SectionTitle,
  Stack,
} from '@/components/ui';
import {
  CONNECTOR_GROUP_LABELS,
  connectorGroup,
  type ConnectorGroup,
} from '@/domain/provider-status';
import {
  connectorMetadata,
  providerFixtures,
} from '@/testing/fixtures/providers';

const GROUP_ORDER: ConnectorGroup[] = [
  'available',
  'candidate',
  'experimental',
  'blocked',
];

export default function ConnectorsScreen() {
  const router = useRouter();

  const groups = useMemo(() => {
    const map = new Map<ConnectorGroup, typeof providerFixtures>();
    for (const provider of providerFixtures) {
      const group = connectorGroup(provider.state);
      map.set(group, [...(map.get(group) ?? []), provider]);
    }
    return GROUP_ORDER.filter((group) => map.has(group)).map((group) => ({
      group,
      providers: map.get(group) ?? [],
    }));
  }, []);

  return (
    <Screen>
      <ScreenScroll>
        <Header
          title="Connectors"
          subtitle="Plan support, data access, and retention before connecting"
        />

        <Notice tone="info" icon="flask-outline">
          Connector actions are design previews. No credentials are requested
          and none is stored.
        </Notice>

        {groups.map(({ group, providers }) => (
          <Stack key={group} gap="lg">
            <SectionTitle
              caption={`${providers.length} provider${providers.length === 1 ? '' : 's'}`}
            >
              {CONNECTOR_GROUP_LABELS[group]}
            </SectionTitle>
            {providers.map((provider) => {
              const metadata = connectorMetadata[provider.id];
              return (
                <ConnectorCard
                  key={`${provider.id}-${provider.state}`}
                  provider={provider}
                  authMethod={metadata.authMethod}
                  dataSummary={metadata.dataSummary}
                  retention={metadata.retention}
                  onOpenDashboard={
                    provider.dashboardUrl
                      ? () => Linking.openURL(provider.dashboardUrl as string)
                      : undefined
                  }
                  onConnect={() =>
                    router.push({
                      pathname: '/connect/[providerId]',
                      params: { providerId: provider.id },
                    })
                  }
                  onDisconnect={() => undefined}
                />
              );
            })}
          </Stack>
        ))}
      </ScreenScroll>
    </Screen>
  );
}

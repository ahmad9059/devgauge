import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, Header, Screen, ScreenScroll } from '@/components/ui';
import { useTheme } from '@/design/theme-provider';

const DOCUMENTS: Record<
  string,
  { title: string; summary: string; body: string[] }
> = {
  privacy: {
    title: 'Privacy policy',
    summary: 'What DevGauge stores on this device and what it does not.',
    body: [
      'DevGauge has no DevGauge account, no analytics SDK, and no cloud sync. Nothing is sent to a DevGauge server.',
      'Connecting a provider loads that provider page inside the app so you sign in with the provider directly. DevGauge reads only the usage that page loads and never reads your password.',
      'Usage snapshots, connections, and preferences are stored in an encrypted local SQLite database (SQLCipher). The database key is generated on this device and kept in Android Keystore-backed secure storage; it is never uploaded.',
      'Provider tokens and API keys are stored only in secure storage, never in the database, logs, diagnostics, or notification content. DevGauge never records provider passwords, browser cookies, or MFA codes.',
      'Notifications are local and generic; they never include account identifiers or usage amounts.',
      'Settings > Data deletes cached usage, connections, and stored credentials. Deleting all local data also removes the database key.',
    ],
  },
  terms: {
    title: 'Terms of use',
    summary: 'Terms for using DevGauge.',
    body: [
      'DevGauge is an independent dashboard. It is not affiliated with or endorsed by any provider it can display.',
      'Provider names are used only to describe the integrations. Official branding is added only with permission.',
      'Terms are provided with the release build.',
    ],
  },
  providers: {
    title: 'Provider disclosures',
    summary: 'Access method for each provider.',
    body: [
      'Claude, Codex, GitHub Copilot, Command Code, OpenCode Go, and Antigravity connect through an in-app session. DevGauge reads only the usage the provider page loads.',
      'Personal and organization billing are separate and are never merged.',
      'Usage data stays on this device; credentials are stored in secure storage.',
    ],
  },
  licenses: {
    title: 'Licenses',
    summary: 'Open-source components used by this build.',
    body: [
      'The interface uses Geist and Geist Mono, licensed under the SIL Open Font License.',
      'Icons come from the Material Design Icons set via Expo vector icons.',
      'Runtime libraries include Expo and React Native (MIT), Zod (MIT), and the audited @noble cryptographic libraries (MIT).',
      'Data-at-rest encryption uses SQLCipher via expo-sqlite; secrets use expo-secure-store.',
    ],
  },
};

export default function LegalScreen() {
  const { document } = useLocalSearchParams<{ document: string }>();
  const { theme, typography } = useTheme();
  const doc = DOCUMENTS[document ?? ''] ?? {
    title: 'Document',
    summary: 'This document is not available.',
    body: [],
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title={doc.title} subtitle={doc.summary} />
        {doc.body.map((paragraph) => (
          <Card key={paragraph}>
            <Text
              style={[typography.body, { color: theme.colors.textSecondary }]}
            >
              {paragraph}
            </Text>
          </Card>
        ))}
      </ScreenScroll>
    </Screen>
  );
}

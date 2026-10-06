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
      'Website connectors open the provider page inside the app so you sign in directly with the provider. Antigravity uses Google authorization through a browser Custom Tab. Authentication and usage requests go to the provider and its identity services.',
      'Usage snapshots, connections, and preferences are stored in an encrypted local SQLite database (SQLCipher). The database key is generated on this device and kept in Android Keystore-backed secure storage; it is never uploaded.',
      'Provider tokens and API keys are stored only in secure storage, never in the database, logs, diagnostics, or notification content. Passwords and MFA codes are not captured. Provider website cookies remain in the device’s WebView storage and are not exported to diagnostics.',
      'Notifications are local and use generic copy by default. You can include the provider and usage-window name; account identifiers and usage amounts are omitted.',
      'Settings > Clear cached usage removes snapshots while keeping connections. Delete all local data removes connections, snapshots, credentials, preferences, owned reminders, and the database key. Browser sign-in can remain; sign out on provider websites to end those sessions.',
    ],
  },
  terms: {
    title: 'Terms of use',
    summary: 'Terms for using DevGauge.',
    body: [
      'DevGauge is an independent dashboard. It is not affiliated with or endorsed by any provider it can display.',
      'Use DevGauge only with accounts you own or are authorized to access, and follow the terms of the connected providers.',
      'Usage values reflect the most recent successful refresh. Provider websites remain the authoritative source for billing, allowances, and account restrictions.',
      'DevGauge is provided under the MIT License, without warranty. You are responsible for decisions made using its displayed usage and reminders.',
      'Provider names and logos belong to their respective owners and identify the available integrations. Their inclusion does not imply endorsement.',
    ],
  },
  providers: {
    title: 'Provider disclosures',
    summary: 'Access method for each provider.',
    body: [
      'Claude, Codex, GitHub Copilot, Command Code and OpenCode Go use persistent in-app website sessions for usage capture. Antigravity uses Google OAuth and provider quota requests.',
      'Available usage windows depend on your provider plan and account access. Page changes, expired sessions, or provider outages can interrupt refresh; the last successful snapshot is preserved.',
      'Usage data stays on this device; credentials are stored in secure storage.',
    ],
  },
  licenses: {
    title: 'Licenses',
    summary: 'Open-source components used by this build.',
    body: [
      'DevGauge source code is licensed under the MIT License. The license and third-party notices are available in the GitHub repository at github.com/ahmad9059/devgauge.',
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

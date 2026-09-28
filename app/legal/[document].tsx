import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { Card, Header, Notice, Screen, ScreenScroll } from '@/components/ui';
import { useTheme } from '@/design/theme-provider';

const DOCUMENTS: Record<
  string,
  { title: string; summary: string; body: string[] }
> = {
  privacy: {
    title: 'Privacy policy',
    summary: 'What DevGauge stores on this device and what it does not.',
    body: [
      'DevGauge has no DevGauge account, no analytics SDK, and no cloud sync. This build makes no provider network requests.',
      'Usage snapshots, connections, and preferences are stored in an encrypted local SQLite database (SQLCipher). The database key is generated on this device and kept in Android Keystore-backed secure storage; it is never uploaded.',
      'Provider tokens and API keys are stored only in secure storage, never in the database, logs, diagnostics, or notification content. DevGauge never records provider passwords, browser cookies, or MFA codes.',
      'Notifications are local and generic; they never include account identifiers or usage amounts. Official provider pages open in your browser only from a fixed allowlist.',
      'Settings > Data deletes cached usage, connections, and stored credentials. Deleting all local data also removes the database key.',
      'A release build ships a finalized policy before any provider connection becomes available.',
    ],
  },
  terms: {
    title: 'Terms of use',
    summary: 'Preview build terms.',
    body: [
      'DevGauge is an independent dashboard. It is not affiliated with or endorsed by any provider it can display.',
      'Provider names are used only to describe the integrations. Official branding is added only with permission.',
      'Final terms ship with the release build.',
    ],
  },
  providers: {
    title: 'Provider disclosures',
    summary: 'Support tier and access method for each provider.',
    body: [
      'GitHub Copilot is release-disabled: the Android website-session feasibility and the GitHub App permission spike must pass first. Personal and organization billing are separate, never merged.',
      'Command Code and OpenCode Go are experimental and make no network request until a verified, read-only vendor contract is recorded.',
      'Claude and Codex are manual-only until their Android website-session gates pass; DevGauge opens the official usage page and can keep a local reset reminder.',
      'Gemini CLI is the coding agent, not the consumer Gemini app. DevGauge shows only figures you share from the CLI, labeled with their source and time; they are not account-wide live quota.',
    ],
  },
  licenses: {
    title: 'Licenses',
    summary: 'Open-source components used by this build.',
    body: [
      'The interface uses IBM Plex Sans and JetBrains Mono, both licensed under the SIL Open Font License.',
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
    summary: 'This document is not available in the preview build.',
    body: [],
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header title={doc.title} subtitle={doc.summary} />
        <Notice tone="info" icon="file-document-outline">
          Draft text for an unreleased preview build. A finalized version is
          required before release.
        </Notice>
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

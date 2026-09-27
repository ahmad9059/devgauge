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
    summary: 'What this preview build does and does not collect.',
    body: [
      'This preview build collects no usage data and contacts no provider. It has no DevGauge account and no analytics SDK.',
      'When connectors are enabled in a later phase, usage snapshots stay on this device. Provider passwords, browser cookies, authorization codes, and secrets are never logged or stored.',
      'A release build will ship a finalized policy before any provider connection becomes available.',
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
      'Claude, Codex, and GitHub Copilot are supported tiers; their sign-in methods are still under Phase 1 review.',
      'Command Code and OpenCode Go are experimental and stay disabled until their usage contracts are confirmed.',
      'Gemini CLI is the coding agent, not the consumer Gemini app. No account-wide Android quota source is confirmed yet.',
    ],
  },
  licenses: {
    title: 'Licenses',
    summary: 'Open-source components used by this build.',
    body: [
      'The interface uses IBM Plex Sans and JetBrains Mono, both licensed under the SIL Open Font License.',
      'Icons come from the Material Design Icons set via Expo vector icons.',
      'Expo, React Native, and supporting libraries remain under their respective open-source licenses.',
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

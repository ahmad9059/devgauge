import { Text } from 'react-native';

import {
  Card,
  Header,
  Screen,
  ScreenScroll,
  SectionTitle,
} from '@/components/ui';
import { useTheme } from '@/design/theme-provider';

const FAQ = [
  {
    question: 'Where is my usage data stored?',
    answer:
      'On this device only. There is no DevGauge account and no cloud sync in this version.',
  },
  {
    question: 'Why do some providers show no data?',
    answer:
      'A provider stays disabled until DevGauge has an approved usage source for it. Disabled connectors never ask for a password.',
  },
  {
    question: 'How do I remove my data?',
    answer:
      'Settings, then Data, deletes cached snapshots and any stored connection for this device.',
  },
];

export default function SupportScreen() {
  const { theme, typography } = useTheme();
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header
          title="Support"
          subtitle="Answers and diagnostics for this build"
        />
        <SectionTitle>Frequently asked</SectionTitle>
        {FAQ.map((item) => (
          <Card key={item.question}>
            <Text
              style={[
                typography.bodyStrong,
                { color: theme.colors.textPrimary },
              ]}
            >
              {item.question}
            </Text>
            <Text
              style={[typography.body, { color: theme.colors.textSecondary }]}
            >
              {item.answer}
            </Text>
          </Card>
        ))}

        <SectionTitle>Diagnostics</SectionTitle>
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          A redacted diagnostics export is planned. It will never include
          tokens, cookies, or account identifiers.
        </Text>
      </ScreenScroll>
    </Screen>
  );
}

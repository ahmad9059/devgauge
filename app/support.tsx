import { useState } from 'react';
import { Linking, Text } from 'react-native';

import {
  Card,
  Button,
  Header,
  Screen,
  ScreenScroll,
  SectionTitle,
  Notice,
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
      'Connect the provider from Connectors first. Usage depends on your account plan and the data exposed by the provider. If a connected provider stops updating, open its details and reauthorize the session.',
  },
  {
    question: 'How do I remove my data?',
    answer:
      'Settings > Clear cached usage removes snapshots while keeping connections. Delete all local data removes app records, credentials, preferences, and reminders. Website sign-in can remain; sign out on the provider website to end that session.',
  },
  {
    question: 'When does usage refresh?',
    answer:
      'DevGauge refreshes when opened or returned to the foreground, subject to freshness checks. You can also refresh manually. Android schedules background refresh with a six-hour minimum interval and may defer it for battery or network conditions.',
  },
  {
    question: 'What happens when a refresh fails?',
    answer:
      'Temporary failures are retried automatically. The last successful snapshot stays visible. Authentication errors require reconnecting; rate limits pause refresh until the cooldown ends.',
  },
];

export default function SupportScreen() {
  const { theme, typography } = useTheme();
  const [linkError, setLinkError] = useState(false);
  const openLink = (url: string) => {
    setLinkError(false);
    void Linking.openURL(url).catch(() => setLinkError(true));
  };
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <Header
          title="Support"
          subtitle="Help with connections, usage, and your data"
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

        <SectionTitle>Get help</SectionTitle>
        <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
          Report a problem or read the documentation on GitHub. Include your
          Android version and steps to reproduce the issue. Remove account
          details, tokens, cookies, and authorization codes from screenshots.
        </Text>
        <Button
          label="Report an issue"
          icon="open-in-new"
          onPress={() =>
            openLink('https://github.com/ahmad9059/devgauge/issues')
          }
        />
        <Button
          label="Documentation"
          variant="secondary"
          icon="book-open-outline"
          onPress={() =>
            openLink('https://github.com/ahmad9059/devgauge#readme')
          }
        />
        <Button
          label="Security policy"
          variant="ghost"
          icon="shield-lock-outline"
          onPress={() =>
            openLink('https://github.com/ahmad9059/devgauge/security/policy')
          }
        />
        {linkError ? (
          <Notice tone="danger" icon="alert-outline">
            Could not open the link. Visit github.com/ahmad9059/devgauge in your
            browser.
          </Notice>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

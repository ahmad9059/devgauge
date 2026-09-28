import { Card, ListRow, Notice, SectionTitle, Stack } from '@/components/ui';
import { useTheme } from '@/design/theme-provider';
import {
  experimentalDisclosure,
  type ExperimentalProviderId,
} from '@/features/connections/experimental';
import { Text } from 'react-native';

/**
 * Experimental disclosure shown before an API-key connector can be enabled.
 * Presentational only; all copy comes from the testable `experimental` module.
 */
export function ExperimentalDisclosure({
  providerId,
}: {
  providerId: ExperimentalProviderId;
}) {
  const { theme, typography } = useTheme();
  const disclosure = experimentalDisclosure(providerId);
  return (
    <Stack gap="md">
      <Notice tone="warning" icon="flask-outline">
        {disclosure.summary}
      </Notice>
      <Card>
        <SectionTitle>Before you connect</SectionTitle>
        {disclosure.points.map((point) => (
          <Text
            key={point}
            style={[typography.body, { color: theme.colors.textSecondary }]}
          >
            {point}
          </Text>
        ))}
      </Card>
      <Notice tone="danger" icon="alert-outline">
        {disclosure.broadKeyWarning}
      </Notice>
      <ListRow
        title="Revoke access"
        subtitle={disclosure.revocation.instructions}
      />
      <Text style={[typography.caption, { color: theme.colors.textMuted }]}>
        {disclosure.killSwitchNote}
      </Text>
    </Stack>
  );
}

import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Notice, StatusChip } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { describeState } from '@/domain/provider-status';
import {
  automaticSyncExplanation,
  type ManualProviderId,
} from '@/features/connections/manual-flows';

/**
 * Release-disabled/manual card. It explains why automatic sync is unavailable,
 * offers an allowlisted first-party link, and never presents a fake login.
 */
export function BlockedProviderCard({
  providerId,
  displayName,
  onOpenFirstParty,
}: {
  providerId: ManualProviderId;
  displayName: string;
  onOpenFirstParty?: () => void;
}) {
  const { theme, typography } = useTheme();
  const status = describeState('blocked');
  return (
    <Card>
      <View style={styles.headerRow}>
        <Text
          style={[typography.bodyStrong, { color: theme.colors.textPrimary }]}
        >
          {displayName}
        </Text>
        <StatusChip
          label={status.label}
          tone={status.tone}
          icon={status.icon}
        />
      </View>
      <Text style={[typography.body, { color: theme.colors.textSecondary }]}>
        {automaticSyncExplanation(providerId)}
      </Text>
      <Notice tone="info" icon="link-variant">
        Opens an official provider page in your browser. Opening a page never
        marks the provider as connected.
      </Notice>
      {onOpenFirstParty ? (
        <Button
          label="Open official page"
          variant="secondary"
          icon="open-in-new"
          onPress={onOpenFirstParty}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});

import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, TextInput } from 'react-native';

import { Button, Notice, Stack } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { manualDataLabelText } from '@/features/connections/manual-flows';
import { normalizeResetTime } from '@/domain/reset-time';
import { validateManualReset } from '@/features/connections/manual-reset';

/**
 * Manual reset-time entry. The value is user-provided and clearly labeled; the
 * caller persists it and schedules one local reminder.
 */
export function ManualResetForm({
  timezoneOffsetMinutes,
  now,
  onSubmit,
  submitLabel = 'Save reminder',
  initialValue = '',
}: {
  timezoneOffsetMinutes: number | null;
  now: Date;
  onSubmit: (resetsAt: string) => Promise<void> | void;
  submitLabel?: string;
  initialValue?: string;
}) {
  const { theme, typography } = useTheme();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Stack gap="md">
      <Notice tone="info" icon="account-edit-outline">
        {manualDataLabelText()}
      </Notice>
      <Text
        style={[typography.bodyStrong, { color: theme.colors.textPrimary }]}
      >
        Reset date and time
      </Text>
      <Text style={[typography.caption, { color: theme.colors.textSecondary }]}>
        Include Z for UTC or your timezone offset, for example
        2026-10-15T09:00+05:00.
      </Text>
      <TextInput
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setError(null);
        }}
        placeholder="YYYY-MM-DDTHH:MM+05:00"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Reset time"
        style={[
          styles.input,
          typography.body,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.controlBorder,
          },
        ]}
      />
      {error ? (
        <Notice tone="danger" icon="alert-outline">
          {error}
        </Notice>
      ) : null}
      <Button
        label={submitLabel}
        icon="bell-outline"
        loading={busy}
        onPress={async () => {
          const resetsAt = value.trim();
          const validation = validateManualReset({
            resetsAt,
            timezoneOffsetMinutes,
            now,
          });
          if (!validation.ok) {
            setError(validation.reason);
            return;
          }
          setBusy(true);
          try {
            await onSubmit(normalizeResetTime(resetsAt)!);
            AccessibilityInfo.announceForAccessibility('Reminder saved.');
            setValue('');
          } catch {
            setError(
              'Could not save the reminder. Check notification permission and try again.',
            );
            AccessibilityInfo.announceForAccessibility(
              'Could not save the reminder.',
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md },
});

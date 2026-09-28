import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button, Notice, Stack } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { manualDataLabelText } from '@/features/connections/manual-flows';
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
}: {
  timezoneOffsetMinutes: number | null;
  now: Date;
  onSubmit: (resetsAt: string) => Promise<void> | void;
  submitLabel?: string;
}) {
  const { theme, typography } = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Stack gap="md">
      <Notice tone="info" icon="account-edit-outline">
        {manualDataLabelText()}
      </Notice>
      <TextInput
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setError(null);
        }}
        placeholder="YYYY-MM-DDTHH:MM (UTC)"
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
            await onSubmit(resetsAt);
            setValue('');
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

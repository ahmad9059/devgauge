import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button, Notice, Stack } from '@/components/ui';
import { spacing } from '@/design/tokens';
import { useTheme } from '@/design/theme-provider';
import { validateApiKey } from '@/features/connections/api-key';

/**
 * Secure native API-key field. The value is held in component state only and is
 * cleared after a successful submit; it is never logged and never written to
 * SQLite (the caller persists an opaque credential reference in SecureStore).
 */
export function ApiKeyForm({
  onSubmit,
  submitLabel = 'Connect',
  extraWarning,
}: {
  onSubmit: (apiKey: string) => Promise<void> | void;
  submitLabel?: string;
  extraWarning?: string;
}) {
  const { theme, typography } = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Stack gap="md">
      {extraWarning ? (
        <Notice tone="warning" icon="alert-outline">
          {extraWarning}
        </Notice>
      ) : null}
      <TextInput
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setError(null);
        }}
        placeholder="Paste your API key"
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        accessibilityLabel="API key"
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
        icon="key-outline"
        loading={busy}
        onPress={async () => {
          const result = validateApiKey(value);
          if (!result.ok) {
            setError(result.reason);
            return;
          }
          setBusy(true);
          try {
            await onSubmit(value.trim());
          } finally {
            setBusy(false);
            setValue('');
          }
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
});

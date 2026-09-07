import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, PROVIDER_LABELS, ProviderMark, Surface, useTheme } from "../../components";

type Step = "intro" | "action" | "verifying" | "success";

const EXPLANATION: Record<string, { how: string; privacy: string }> = {
  "claude-code": {
    how: "Install the companion and scan or paste a pairing code to sync Claude Code usage.",
    privacy: "Only usage status-line fields sync. Prompts, paths, and tokens never leave your device.",
  },
  codex: {
    how: "Sign in with ChatGPT using a device code. DevGauge never asks for your email or password.",
    privacy: "ChatGPT authentication is handled by the Codex app server; we only read quota and activity.",
  },
  "opencode-go": {
    how: "Paste your OpenCode Go API key. It's stored encrypted and used to fetch usage.",
    privacy: "We store the key encrypted and use it only to read usage for alerts.",
  },
  "github-copilot": {
    how: "Authorize DevGauge with GitHub in your browser.",
    privacy: "We never access your repositories or code — only Copilot quota entitlements.",
  },
};

export function ConnectScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const provider = providerId ?? "opencode-go";

  const [step, setStep] = useState<Step>("intro");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState(false);

  const start = (): void => {
    setError(false);
    setStep("action");
  };

  const verify = (): void => {
    if (provider === "opencode-go" && apiKey.trim().length === 0) {
      setError(true);
      return;
    }
    setStep("verifying");
    setTimeout(() => setStep("success"), 1400);
  };

  const done = (): void => router.replace("/connectors");

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        <Button label="‹" variant="ghost" onPress={() => router.back()} style={{ minWidth: 48, paddingHorizontal: 0 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="titleLarge" accessibilityRole="header">
            Connect {PROVIDER_LABELS[provider]}
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Surface padded style={{ gap: theme.spacing.lg, alignItems: "center" }}>
          <ProviderMark provider={provider} size={56} />
          {step === "intro" && (
            <View style={{ gap: theme.spacing.md, alignSelf: "stretch" }}>
              <AppText variant="body" tone="secondary">
                {EXPLANATION[provider]?.how}
              </AppText>
              <AppText variant="caption" tone="muted">
                Privacy: {EXPLANATION[provider]?.privacy}
              </AppText>
              <Button label="Start" onPress={start} />
              <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
            </View>
          )}

          {step === "action" && (
            <View style={{ gap: theme.spacing.md, alignSelf: "stretch" }}>
              {provider === "opencode-go" && (
                <>
                  <AppText variant="label" tone="secondary">
                    OpenCode Go API key
                  </AppText>
                  <TextInput
                    accessibilityLabel="OpenCode Go API key"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    textContentType="password"
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder="sk-…"
                    placeholderTextColor={theme.colors.textMuted}
                    style={{
                      minHeight: 48,
                      borderRadius: theme.radius.md,
                      borderWidth: 1,
                      borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
                      backgroundColor: theme.colors.surfaceSunken,
                      color: theme.colors.text,
                      paddingHorizontal: theme.spacing.md,
                    }}
                  />
                  {error ? (
                    <AppText variant="caption" tone="danger">
                      Enter your API key to continue.
                    </AppText>
                  ) : null}
                </>
              )}

              {provider === "codex" && (
                <View style={{ gap: theme.spacing.sm, alignItems: "center" }}>
                  <AppText variant="display" tabular style={{ letterSpacing: 4 }}>
                    ABCD-1234
                  </AppText>
                  <AppText variant="body" tone="secondary">
                    Open the verification page and enter this code.
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Expires in 14:59 · auth.openai.com/codex/device
                  </AppText>
                </View>
              )}

              {provider === "github-copilot" && (
                <AppText variant="body" tone="secondary">
                  You&rsquo;ll be taken to GitHub to authorize DevGauge. This doesn&rsquo;t run on this device in the shell.
                </AppText>
              )}

              {provider === "claude-code" && (
                <AppText variant="body" tone="secondary">
                  Pairing code shown on your desktop companion. This syncs Claude status-line usage only.
                </AppText>
              )}

              <Button label="Continue" onPress={verify} />
              <Button label="Back" variant="ghost" onPress={() => setStep("intro")} />
            </View>
          )}

          {step === "verifying" && (
            <View style={{ gap: theme.spacing.md, alignItems: "center" }}>
              <AppText variant="body" tone="secondary">
                Verifying connection…
              </AppText>
              <Button label="Cancel" variant="ghost" onPress={() => setStep("intro")} />
            </View>
          )}

          {step === "success" && (
            <View style={{ gap: theme.spacing.md, alignSelf: "stretch", alignItems: "center" }}>
              <AppText variant="titleLarge" tone="available">
                Connected
              </AppText>
              <AppText variant="body" tone="secondary">
                {PROVIDER_LABELS[provider]} is syncing. Your usage will appear on the Usage screen.
              </AppText>
              <Button label="Done" onPress={done} />
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
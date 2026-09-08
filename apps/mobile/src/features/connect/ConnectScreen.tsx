import { useEffect, useState } from "react";
import { Linking, ScrollView, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, PROVIDER_LABELS, ProviderMark, Surface, useTheme } from "../../components";
import { api, type CodexLoginAttempt } from "../../api/client";
import { clearCodexLoginAttemptId, readCodexLoginAttemptId, writeCodexLoginAttemptId } from "../../storage/codex-login";

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
  const [message, setMessage] = useState<string | null>(null);
  const [codexAttempt, setCodexAttempt] = useState<CodexLoginAttempt | null>(null);

  useEffect(() => {
    if (provider !== "codex") return;
    let active = true;
    void readCodexLoginAttemptId().then(async (attemptId) => {
      if (!active || !attemptId) return;
      setStep("verifying");
      const status = await api.codexLoginStatus(attemptId).catch(() => null);
      if (active && status) setCodexAttempt(status);
    });
    return () => {
      active = false;
    };
  }, [provider]);

  useEffect(() => {
    if (provider !== "codex" || !codexAttempt?.attemptId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (attemptId: string): Promise<void> => {
      try {
        const status = await api.codexLoginStatus(attemptId);
        if (!active) return;
        setCodexAttempt(status);
        if (status.status === "code_ready") setStep("action");
        if (status.status === "connected") {
          await clearCodexLoginAttemptId();
          setStep("success");
          return;
        }
        if (["failed", "cancelled", "expired"].includes(status.status)) {
          await clearCodexLoginAttemptId();
          setMessage(status.status === "expired" ? "This code expired. Start again for a new code." : "Connection was not completed. Try again.");
          setStep("intro");
          return;
        }
        timer = setTimeout(() => void poll(attemptId), 2_000);
      } catch {
        if (active) timer = setTimeout(() => void poll(attemptId), 3_000);
      }
    };
    timer = setTimeout(() => void poll(codexAttempt.attemptId), 1_000);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [codexAttempt?.attemptId, provider]);

  const start = async (): Promise<void> => {
    setError(false);
    setMessage(null);
    if (provider === "codex") {
      setStep("verifying");
      try {
        const attempt = await api.startCodexLogin();
        setCodexAttempt(attempt);
        await writeCodexLoginAttemptId(attempt.attemptId);
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : "Could not start Codex login.");
        setStep("intro");
      }
      return;
    }
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
  const cancelCodex = async (): Promise<void> => {
    if (codexAttempt) await api.cancelCodexLogin(codexAttempt.attemptId).catch(() => undefined);
    await clearCodexLoginAttemptId();
    setCodexAttempt(null);
    setStep("intro");
  };

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
              {message ? <AppText variant="caption" tone="danger">{message}</AppText> : null}
              <Button label="Start" onPress={() => void start()} />
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
                    {codexAttempt?.userCode ?? "Preparing"}
                  </AppText>
                  <AppText variant="body" tone="secondary">
                    Open the verification page and enter this code.
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Expires {codexAttempt ? new Date(codexAttempt.expiresAt).toLocaleTimeString() : "soon"}
                  </AppText>
                  <Button
                    label="Copy code"
                    variant="ghost"
                    disabled={!codexAttempt?.userCode}
                    onPress={() => void Clipboard.setStringAsync(codexAttempt?.userCode ?? "")}
                  />
                  <Button
                    label="Open verification page"
                    disabled={!codexAttempt?.verificationUrl}
                    onPress={() => void Linking.openURL(codexAttempt?.verificationUrl ?? "")}
                  />
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

              {provider !== "codex" ? <Button label="Continue" onPress={verify} /> : null}
              <Button label="Back" variant="ghost" onPress={() => provider === "codex" ? void cancelCodex() : setStep("intro")} />
            </View>
          )}

          {step === "verifying" && (
            <View style={{ gap: theme.spacing.md, alignItems: "center" }}>
              <AppText variant="body" tone="secondary">
                {provider === "codex" ? "Waiting for Codex login…" : "Verifying connection…"}
              </AppText>
              <Button label="Cancel" variant="ghost" onPress={() => provider === "codex" ? void cancelCodex() : setStep("intro")} />
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

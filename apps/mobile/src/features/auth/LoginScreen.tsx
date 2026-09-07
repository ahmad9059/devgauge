import { useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, Surface, useTheme } from "../../components";
import { useAuth } from "../../auth/AuthContext";

type Step = "email" | "code";

export function LoginScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { signInRequest, signInVerify } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceSunken,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
  } as const;

  const handleRequest = async (): Promise<void> => {
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signInRequest(email);
      if (result.code) setDevCode(result.code);
      setStep("code");
    } catch {
      setError("Couldn’t send a code. Check the server and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (): Promise<void> => {
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInVerify(email, code.trim());
      // AuthProvider flips to signedIn; the (auth) layout redirects to tabs.
    } catch {
      setError("That code wasn’t accepted. Check it and try again.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: theme.spacing.xl }}
      >
        <Surface padded style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="titleLarge" accessibilityRole="header">
              Sign in to DevGauge
            </AppText>
            <AppText variant="body" tone="secondary">
              Email magic link — no password needed.
            </AppText>
          </View>

          {step === "email" ? (
            <View style={{ gap: theme.spacing.md }}>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textMuted}
                style={inputStyle}
              />
              <Button label="Continue" loading={loading} onPress={() => void handleRequest()} />
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              <AppText variant="caption" tone="muted">
                We sent a code to {email.trim().toLowerCase()}.
              </AppText>
              {devCode ? (
                <AppText variant="body" tone="accent">
                  Dev code: {devCode}
                </AppText>
              ) : null}
              <TextInput
                accessibilityLabel="Verification code"
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor={theme.colors.textMuted}
                style={inputStyle}
              />
              <Button label="Verify" loading={loading} onPress={() => void handleVerify()} />
              <Button label="Back" variant="ghost" onPress={() => setStep("email")} />
            </View>
          )}

          {error ? (
            <AppText variant="caption" tone="danger" accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { api } from "../api/client";
import { clearSessionToken, getSessionToken, setSessionToken } from "../storage/secure";
import { clearUsageCache } from "../storage/usage-cache";

type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  email: string | null;
  signInRequest: (email: string) => Promise<{ ok: boolean; code?: string }>;
  signInVerify: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);

  // Session restoration from secure storage.
  useEffect(() => {
    let cancelled = false;
    void getSessionToken()
      .then((token) => {
        if (cancelled) return;
        if (token) setStatus("signedIn");
        else setStatus("signedOut");
      })
      .catch(() => {
        if (!cancelled) setStatus("signedOut");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInRequest = useCallback(async (value: string) => {
    const result = await api.magicLinkRequest(value);
    setEmail(value.trim().toLowerCase());
    return result;
  }, []);

  const signInVerify = useCallback(
    async (value: string, code: string) => {
      const session = await api.magicLinkVerify(value, code);
      await setSessionToken(session.token);
      setStatus("signedIn");
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Even if the server is unreachable, local sign-out must succeed.
    }
    await clearSessionToken();
    await clearUsageCache();
    setStatus("signedOut");
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, email, signInRequest, signInVerify, signOut }),
    [status, email, signInRequest, signInVerify, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "devgauge.session";

const webStore = {
  get: (): string | null => (typeof localStorage === "undefined" ? null : localStorage.getItem(SESSION_KEY)),
  set: (value: string): void => {
    if (typeof localStorage !== "undefined") localStorage.setItem(SESSION_KEY, value);
  },
  clear: (): void => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
  },
};

/** Opaque session token. Android uses Keystore-backed secure storage; web (dev only) uses localStorage. */
export const getSessionToken = async (): Promise<string | null> =>
  Platform.OS === "web" ? webStore.get() : SecureStore.getItemAsync(SESSION_KEY);

export const setSessionToken = async (token: string): Promise<void> => {
  if (Platform.OS === "web") webStore.set(token);
  else await SecureStore.setItemAsync(SESSION_KEY, token);
};

export const clearSessionToken = async (): Promise<void> => {
  if (Platform.OS === "web") webStore.clear();
  else await SecureStore.deleteItemAsync(SESSION_KEY);
};
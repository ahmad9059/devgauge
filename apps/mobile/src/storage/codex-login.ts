import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "devgauge.codex.login-attempt.v1";

export const readCodexLoginAttemptId = async (): Promise<string | null> => AsyncStorage.getItem(KEY);
export const writeCodexLoginAttemptId = async (attemptId: string): Promise<void> => AsyncStorage.setItem(KEY, attemptId);
export const clearCodexLoginAttemptId = async (): Promise<void> => AsyncStorage.removeItem(KEY);

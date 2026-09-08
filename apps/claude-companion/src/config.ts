import { homedir } from "node:os";
import path from "node:path";

export const COMPANION_VERSION = "0.1.0";
export const DEFAULT_API_ORIGIN = process.env.DEVGAUGE_API_ORIGIN ?? "http://localhost:3000";

/** Companion data root (defaults under the user's home). */
export const configDir = (): string =>
  process.env.DEVGAUGE_COMPANION_DIR ?? path.join(homedir(), ".devgauge", "companion");

export const credentialFilePath = (): string => path.join(configDir(), "credential.json");
export const queueFilePath = (): string => path.join(configDir(), "queue.jsonl.enc");
export const stateFilePath = (): string => path.join(configDir(), "state.json");

export interface CompanionState {
  deviceId: string | null;
  deviceAlias: string | null;
  accountEmail: string | null;
  apiOrigin: string;
  lastCaptureAt: string | null;
  lastSyncAt: string | null;
  version: string;
}

export const emptyState = (): CompanionState => ({
  deviceId: null,
  deviceAlias: null,
  accountEmail: null,
  apiOrigin: DEFAULT_API_ORIGIN,
  lastCaptureAt: null,
  lastSyncAt: null,
  version: COMPANION_VERSION,
});
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { configDir, credentialFilePath } from "./config.js";

/**
 * Device credential + local encryption key.
 *
 * Security model: production expects an OS keyring. This MVP uses a
 * 0600-permission file under the user's home; automatic sync is only permitted
 * when `DEVGAUGE_ALLOW_FILE_CREDENTIALS=1` is set, otherwise the companion
 * reports a blocked state instead of silently weakening storage.
 */
export interface DeviceCredential {
  deviceId: string;
  deviceSecret: string;
  /** Base64 local AES key used to encrypt the offline queue at rest. */
  localKeyBase64: string;
  accountEmail: string | null;
}

export class CredentialStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialStoreError";
  }
}

const FILE_CREDENTIALS_ALLOWED = (): boolean => process.env.DEVGAUGE_ALLOW_FILE_CREDENTIALS === "1";

export const isFileCredentialsAllowed = FILE_CREDENTIALS_ALLOWED;

export const loadCredential = async (): Promise<DeviceCredential | null> => {
  try {
    const raw = await readFile(credentialFilePath(), "utf8");
    const parsed = JSON.parse(raw) as DeviceCredential;
    if (!parsed.deviceId || !parsed.deviceSecret || !parsed.localKeyBase64) return null;
    return parsed;
  } catch {
    return null;
  }
};

const ensureDir = async (): Promise<void> => {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
};

export const saveCredential = async (credential: DeviceCredential): Promise<void> => {
  if (!FILE_CREDENTIALS_ALLOWED()) {
    throw new CredentialStoreError(
      "No supported OS keyring detected. Set DEVGAUGE_ALLOW_FILE_CREDENTIALS=1 to allow an encrypted local file " +
        "(0600). This is not recommended for production."
    );
  }
  await ensureDir();
  const tmp = `${credentialFilePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(credential), { mode: 0o600 });
  await rename(tmp, credentialFilePath());
};

export const deleteCredential = async (): Promise<void> => {
  const { rm } = await import("node:fs/promises");
  await rm(credentialFilePath(), { force: true });
};

export const newLocalKey = (): Buffer => randomBytes(32);

/** Provision a fresh device credential (paired). */
export const createCredential = (input: { deviceId: string; deviceSecret: string; accountEmail: string | null }): DeviceCredential => ({
  deviceId: input.deviceId,
  deviceSecret: input.deviceSecret,
  localKeyBase64: newLocalKey().toString("base64"),
  accountEmail: input.accountEmail,
});

export { path as _path };
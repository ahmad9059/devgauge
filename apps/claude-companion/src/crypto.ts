import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

const gcmEncrypt = (key: Buffer, plaintext: Buffer): Buffer => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
};

const gcmDecrypt = (key: Buffer, blob: Buffer): Buffer => {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
};

/** Derives a 32-byte AES key from a passphrase. */
export const deriveKey = (passphrase: string): Buffer => createHash("sha256").update(passphrase).digest();

export const encryptBlob = (key: Buffer, plaintext: string): Buffer => gcmEncrypt(key, Buffer.from(plaintext, "utf8"));
export const decryptBlob = (key: Buffer, blob: Buffer): string => gcmDecrypt(key, blob).toString("utf8");

export { randomBytes };
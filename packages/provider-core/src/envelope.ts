import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const MASTER_KEY_VERSION = 1;
const ALGORITHM = "aes-256-gcm";

export interface Envelope {
  ciphertext: Buffer;
  wrappedDataKey: Buffer;
  keyVersion: number;
}

export interface CryptoService {
  seal(plaintext: Buffer): Envelope;
  open(envelope: Envelope): Buffer;
  rewrap(envelope: Envelope): Envelope;
}

const encrypt = (key: Buffer, plaintext: Buffer): Buffer => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
};

const decrypt = (key: Buffer, blob: Buffer): Buffer => {
  if (blob.length < 28) throw new Error("Invalid encrypted envelope");
  const decipher = createDecipheriv(ALGORITHM, key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
};

export const createCryptoService = (masterKeyValue: string): CryptoService => {
  if (masterKeyValue.length < 32) throw new Error("Encryption master key must be at least 32 characters");
  const masterKey = createHash("sha256").update(masterKeyValue).digest();
  return {
    seal(plaintext) {
      const dataKey = randomBytes(32);
      return {
        ciphertext: encrypt(dataKey, plaintext),
        wrappedDataKey: encrypt(masterKey, dataKey),
        keyVersion: MASTER_KEY_VERSION,
      };
    },
    open(envelope) {
      return decrypt(decrypt(masterKey, envelope.wrappedDataKey), envelope.ciphertext);
    },
    rewrap(envelope) {
      const dataKey = decrypt(masterKey, envelope.wrappedDataKey);
      return { ...envelope, wrappedDataKey: encrypt(masterKey, dataKey), keyVersion: MASTER_KEY_VERSION };
    },
  };
};

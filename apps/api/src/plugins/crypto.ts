import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import fp from "fastify-plugin";

import type { ApiEnv } from "../env.js";

export const MASTER_KEY_VERSION = 1;
const ALGORITHM = "aes-256-gcm";

export interface Envelope {
  ciphertext: Buffer;
  wrappedDataKey: Buffer;
  keyVersion: number;
}

export interface CryptoService {
  /** Wraps plaintext with a fresh per-item data key encrypted by the master key. */
  seal(plaintext: Buffer): Envelope;
  /** Unwraps and decrypts an envelope. */
  open(envelope: Envelope): Buffer;
  /** Rewraps an envelope's data key under the master key without exposing plaintext. */
  rewrap(envelope: Envelope): Envelope;
}

declare module "fastify" {
  interface FastifyInstance {
    crypto: CryptoService;
  }
}

const gcmEncrypt = (key: Buffer, plaintext: Buffer): Buffer => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
};

const gcmDecrypt = (key: Buffer, blob: Buffer): Buffer => {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ct = blob.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
};

export const createCryptoService = (masterKeyValue: string): CryptoService => {
  const masterKey = createHash("sha256").update(masterKeyValue).digest();
  return {
    seal(plaintext: Buffer): Envelope {
      const dataKey = randomBytes(32);
      const wrappedDataKey = gcmEncrypt(masterKey, dataKey);
      const ciphertext = gcmEncrypt(dataKey, plaintext);
      return { ciphertext, wrappedDataKey, keyVersion: MASTER_KEY_VERSION };
    },
    open(envelope: Envelope): Buffer {
      const dataKey = gcmDecrypt(masterKey, envelope.wrappedDataKey);
      return gcmDecrypt(dataKey, envelope.ciphertext);
    },
    rewrap(envelope: Envelope): Envelope {
      const dataKey = gcmDecrypt(masterKey, envelope.wrappedDataKey);
      return {
        ...envelope,
        wrappedDataKey: gcmEncrypt(masterKey, dataKey),
        keyVersion: MASTER_KEY_VERSION,
      };
    },
  };
};

export const registerCrypto = fp(async (app: import("fastify").FastifyInstance, opts: { env: ApiEnv }) => {
  if (!opts.env.ENC_MASTER_KEY) {
    throw new Error("ENC_MASTER_KEY is required to register the crypto plugin");
  }
  app.decorate("crypto", createCryptoService(opts.env.ENC_MASTER_KEY));
});
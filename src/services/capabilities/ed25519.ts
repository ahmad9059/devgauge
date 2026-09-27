import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// @noble/ed25519 is pure JS, so it works in Hermes and in Node tests. The
// SHA-512 hook must be installed once before sign/verify.
ed.hashes.sha512 = sha512;

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

export function verifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

export function signEd25519(
  message: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  return ed.sign(message, secretKey);
}

export function publicKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(secretKey);
}

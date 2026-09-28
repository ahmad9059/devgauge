import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  base64UrlEncode,
  createCodeChallenge,
  createCodeVerifier,
  createPkcePair,
  createState,
  type Sha256,
} from '@/services/auth/pkce';

const sha256: Sha256 = async (input) =>
  new Uint8Array(createHash('sha256').update(input).digest());

const randomBytes = async (length: number) =>
  new Uint8Array(Array.from({ length }, (_, index) => (index * 7 + 1) % 256));

describe('pkce', () => {
  it('encodes base64url without padding', () => {
    expect(base64UrlEncode(new Uint8Array([251, 255]))).toBe('-_8');
    expect(base64UrlEncode(new Uint8Array([0, 0, 0]))).toBe('AAAA');
  });

  it('matches the RFC 7636 appendix B S256 vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await createCodeChallenge(verifier, sha256)).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('creates a verifier and state with at least 256 bits of entropy', async () => {
    const verifier = await createCodeVerifier(randomBytes);
    expect(verifier).toHaveLength(43);
    const state = await createState(randomBytes);
    expect(state).toHaveLength(43);
    const pair = await createPkcePair(randomBytes, sha256);
    expect(pair.method).toBe('S256');
    expect(pair.challenge).not.toBe(pair.verifier);
  });

  it('rejects a random source with the wrong length', async () => {
    await expect(
      createCodeVerifier(async () => new Uint8Array(4)),
    ).rejects.toThrow(/32 bytes/);
  });
});

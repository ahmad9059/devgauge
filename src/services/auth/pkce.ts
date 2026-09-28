export type PkcePair = {
  verifier: string;
  challenge: string;
  method: 'S256';
};

export type RandomBytes = (length: number) => Promise<Uint8Array>;
export type Sha256 = (input: Uint8Array) => Promise<Uint8Array>;

const BASE64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64url without padding, implemented without Buffer or atob. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : undefined;
    const third = index + 2 < bytes.length ? bytes[index + 2] : undefined;
    out += BASE64[first >> 2];
    out += BASE64[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    if (second === undefined) break;
    out += BASE64[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    if (third === undefined) break;
    out += BASE64[third & 0x3f];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0x7f;
  }
  return bytes;
}

/** RFC 7636 verifier: 32 random bytes -> 43 base64url characters. */
export async function createCodeVerifier(
  randomBytes: RandomBytes,
): Promise<string> {
  const bytes = await randomBytes(32);
  if (bytes.length !== 32) throw new Error('randomBytes must return 32 bytes');
  return base64UrlEncode(bytes);
}

export async function createCodeChallenge(
  verifier: string,
  sha256: Sha256,
): Promise<string> {
  return base64UrlEncode(await sha256(asciiBytes(verifier)));
}

export async function createPkcePair(
  randomBytes: RandomBytes,
  sha256: Sha256,
): Promise<PkcePair> {
  const verifier = await createCodeVerifier(randomBytes);
  return {
    verifier,
    challenge: await createCodeChallenge(verifier, sha256),
    method: 'S256',
  };
}

/** At least 256 bits of entropy for OAuth state. */
export async function createState(randomBytes: RandomBytes): Promise<string> {
  const bytes = await randomBytes(32);
  if (bytes.length !== 32) throw new Error('randomBytes must return 32 bytes');
  return base64UrlEncode(bytes);
}

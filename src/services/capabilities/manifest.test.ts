import { describe, expect, it } from 'vitest';

import {
  bytesToHex,
  hexToBytes,
  publicKeyFromSecret,
} from '@/services/capabilities/ed25519';
import {
  CapabilityError,
  CAPABILITY_AUDIENCE,
  compareVersions,
  createCapabilityGate,
  isProviderEnabled,
  signCapabilityManifest,
  verifyCapabilityManifest,
  type CapabilityManifest,
} from '@/services/capabilities/manifest';

const SECRET_HEX = '11'.repeat(32);
const PUBLIC_HEX = bytesToHex(publicKeyFromSecret(hexToBytes(SECRET_HEX)));
const OTHER_SECRET_HEX = '22'.repeat(32);
const NOW = new Date('2026-09-28T00:00:00.000Z');

function baseManifest(
  overrides: Partial<CapabilityManifest> = {},
): CapabilityManifest {
  return {
    version: 3,
    environment: 'production',
    audience: CAPABILITY_AUDIENCE,
    issuedAt: '2026-09-27T00:00:00.000Z',
    expiresAt: '2026-10-27T00:00:00.000Z',
    providers: {
      'command-code': { enabled: false },
      'opencode-go': { enabled: true, schema: 2 },
    },
    ...overrides,
  };
}

function verify(
  raw: unknown,
  overrides: Partial<Parameters<typeof verifyCapabilityManifest>[1]> = {},
) {
  return verifyCapabilityManifest(raw, {
    publicKeyHex: PUBLIC_HEX,
    environment: 'production',
    now: NOW,
    lastAcceptedVersion: 2,
    ...overrides,
  });
}

describe('capability manifest verification', () => {
  it('accepts a correctly signed manifest', () => {
    const manifest = verify(signCapabilityManifest(baseManifest(), SECRET_HEX));
    expect(manifest.version).toBe(3);
    expect(manifest.providers['opencode-go'].enabled).toBe(true);
  });

  it('is independent of provider key order', () => {
    const signed = signCapabilityManifest(baseManifest(), SECRET_HEX);
    const reordered = {
      ...signed,
      providers: {
        'opencode-go': signed.providers['opencode-go'],
        'command-code': signed.providers['command-code'],
      },
    };
    expect(() => verify(reordered)).not.toThrow();
  });

  it('rejects tampered payloads and wrong signers', () => {
    const signed = signCapabilityManifest(baseManifest(), SECRET_HEX);
    const tampered = {
      ...signed,
      providers: { 'opencode-go': { enabled: false } },
    };
    expect(() => verify(tampered)).toThrow(CapabilityError);
    expect(() => verify(tampered)).toThrow(/signature/);
    expect(() =>
      verify(signCapabilityManifest(baseManifest(), OTHER_SECRET_HEX)),
    ).toThrow(/signature/);
  });

  it('rejects audience and environment mismatches', () => {
    const wrongAudience = signCapabilityManifest(
      baseManifest({ audience: 'other.app' }),
      SECRET_HEX,
    );
    expect(() => verify(wrongAudience)).toThrow(/audience/);
    const wrongEnv = signCapabilityManifest(
      baseManifest({ environment: 'preview' }),
      SECRET_HEX,
    );
    expect(() => verify(wrongEnv)).toThrow(/environment/);
  });

  it('enforces issue/expiry with bounded clock skew', () => {
    const future = signCapabilityManifest(
      baseManifest({ issuedAt: '2026-09-28T00:10:00.000Z' }),
      SECRET_HEX,
    );
    expect(() => verify(future)).toThrow(/future/);
    const slightlyFuture = signCapabilityManifest(
      baseManifest({ issuedAt: '2026-09-28T00:02:00.000Z' }),
      SECRET_HEX,
    );
    expect(() => verify(slightlyFuture)).not.toThrow();

    const expired = signCapabilityManifest(
      baseManifest({ expiresAt: '2026-09-27T23:00:00.000Z' }),
      SECRET_HEX,
    );
    expect(() => verify(expired)).toThrow(/expired/);
    const justExpired = signCapabilityManifest(
      baseManifest({ expiresAt: '2026-09-27T23:58:00.000Z' }),
      SECRET_HEX,
    );
    expect(() => verify(justExpired)).not.toThrow();
  });

  it('rejects an equal or lower version as replay', () => {
    const signed = signCapabilityManifest(
      baseManifest({ version: 3 }),
      SECRET_HEX,
    );
    expect(() => verify(signed, { lastAcceptedVersion: 3 })).toThrow(
      /not newer/,
    );
    expect(() => verify(signed, { lastAcceptedVersion: 4 })).toThrow(
      /not newer/,
    );
    expect(() => verify(signed, { lastAcceptedVersion: 2 })).not.toThrow();
  });

  it('rejects malformed manifests', () => {
    expect(() => verify({ foo: 'bar' })).toThrow(/validation/);
  });
});

describe('provider enablement', () => {
  it('honors enabled, minimum version, and expiry', () => {
    const manifest = baseManifest({
      providers: {
        'opencode-go': { enabled: true, minimumAppVersion: '0.2.0' },
        'command-code': { enabled: false },
      },
    });
    expect(isProviderEnabled(manifest, 'opencode-go', '0.2.0', NOW)).toBe(true);
    expect(isProviderEnabled(manifest, 'opencode-go', '0.1.9', NOW)).toBe(
      false,
    );
    expect(isProviderEnabled(manifest, 'command-code', '1.0.0', NOW)).toBe(
      false,
    );
    const afterExpiry = new Date('2026-11-01T00:00:00.000Z');
    expect(
      isProviderEnabled(manifest, 'opencode-go', '1.0.0', afterExpiry),
    ).toBe(false);
  });

  it('compares dotted versions', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });

  it('fails closed with no manifest', () => {
    const gate = createCapabilityGate({ manifest: null, appVersion: '1.0.0' });
    expect(gate.isLiveAllowed('opencode-go')).toBe(false);
    const gateWithManifest = createCapabilityGate({
      manifest: baseManifest(),
      appVersion: '1.0.0',
      now: () => NOW,
    });
    expect(gateWithManifest.isLiveAllowed('opencode-go')).toBe(true);
    expect(gateWithManifest.isLiveAllowed('command-code')).toBe(false);
  });
});

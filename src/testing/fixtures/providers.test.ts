import { describe, expect, it } from 'vitest';

import {
  connectorMetadata,
  findProviderFixture,
  providerFixtures,
  stateShowcase,
  type ProviderState,
} from './providers';

const ALL_STATES: ProviderState[] = [
  'connected',
  'disconnected',
  'candidate-disabled',
  'experimental',
  'blocked',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];

const EXPECTED_IDS = [
  'claude',
  'codex',
  'command-code',
  'opencode-go',
  'github-copilot',
  'gemini-cli',
];

describe('provider fixtures', () => {
  it('defines exactly the six supported providers once each', () => {
    expect(providerFixtures.map((provider) => provider.id).sort()).toEqual(
      [...EXPECTED_IDS].sort(),
    );
  });

  it('shows every window type used by the dashboard', () => {
    const kinds = new Set(
      providerFixtures.flatMap((p) => p.windows.map((w) => w.kind)),
    );
    expect(kinds).toContain('rolling');
    expect(kinds).toContain('weekly');
    expect(kinds).toContain('monthly');
    expect(kinds).toContain('billing-period');
  });

  it('never encodes progress by color alone: every window keeps unit values', () => {
    for (const provider of providerFixtures) {
      for (const window of provider.windows) {
        expect(window.unit).toBeDefined();
        expect(window.percent).toBeDefined();
        if (window.used !== undefined && window.limit !== undefined) {
          expect(window.used).toBeLessThanOrEqual(window.limit);
        }
      }
    }
  });

  it('covers every UI state across the showcase fixtures', () => {
    const states = new Set(stateShowcase.map((provider) => provider.state));
    for (const state of ALL_STATES) {
      expect(states.has(state), `missing state ${state}`).toBe(true);
    }
  });

  it('documents connection metadata for all six providers', () => {
    expect(Object.keys(connectorMetadata).sort()).toEqual(
      [...EXPECTED_IDS].sort(),
    );
    for (const metadata of Object.values(connectorMetadata)) {
      expect(metadata.authMethod.length).toBeGreaterThan(0);
      expect(metadata.dataSummary.length).toBeGreaterThan(0);
      expect(metadata.retention.length).toBeGreaterThan(0);
    }
  });

  it('resolves a fixture by id and returns undefined for unknown ids', () => {
    expect(findProviderFixture('claude')?.displayName).toBe('Claude');
    expect(findProviderFixture(undefined)).toBeUndefined();
    expect(findProviderFixture('not-a-provider')).toBeUndefined();
  });

  it('does not use official brand marks, only neutral monograms', () => {
    for (const provider of providerFixtures) {
      expect(provider.monogram).toMatch(/^[A-Z]{2}$/);
    }
  });
});

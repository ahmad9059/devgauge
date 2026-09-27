import { describe, expect, it } from 'vitest';

import {
  allowsConnection,
  CONNECTOR_GROUP_LABELS,
  connectorGroup,
  describeSource,
  describeState,
  TIER_LABELS,
  type ConnectorGroup,
} from './provider-status';
import type { ProviderState } from '@/testing/fixtures/providers';

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

describe('provider status', () => {
  it('describes every provider state with label, tone, icon and hint', () => {
    for (const state of ALL_STATES) {
      const descriptor = describeState(state);
      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.icon.length).toBeGreaterThan(0);
      expect(descriptor.hint.length).toBeGreaterThan(0);
      expect(Object.keys(descriptor)).toContain('tone');
    }
    expect(Object.keys(TIER_LABELS)).toEqual([
      'supported',
      'experimental',
      'blocked',
    ]);
  });

  it('never offers a connect control for blocked or candidate-disabled providers', () => {
    expect(allowsConnection('blocked')).toBe(false);
    expect(allowsConnection('candidate-disabled')).toBe(false);
    expect(allowsConnection('disconnected')).toBe(true);
    expect(allowsConnection('auth-expired')).toBe(true);
  });

  it('groups every state into exactly one connector section', () => {
    const groups = new Set<ConnectorGroup>(ALL_STATES.map(connectorGroup));
    expect([...groups].sort()).toEqual([
      'available',
      'blocked',
      'candidate',
      'experimental',
    ]);
    for (const group of groups) {
      expect(CONNECTOR_GROUP_LABELS[group].length).toBeGreaterThan(0);
    }
  });

  it('labels the data source honestly', () => {
    expect(describeSource('live')).toBe('Live');
    expect(describeSource('manual')).toBe('Manual');
    expect(describeSource('none')).toBe('None');
  });
});

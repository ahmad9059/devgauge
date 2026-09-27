import { describe, expect, it } from 'vitest';

import { allowedSpikeHost, blockedSpikeHost } from './web-session-spike';

describe('development WebView host boundary', () => {
  it('accepts only reviewed HTTPS hosts for the selected provider', () => {
    expect(allowedSpikeHost('claude', 'https://claude.ai/settings/usage')).toBe(
      'claude.ai',
    );
    expect(
      allowedSpikeHost('github-copilot', 'https://claude.ai/settings/usage'),
    ).toBeNull();
  });

  it('rejects lookalike hosts, unsafe schemes and embedded credentials', () => {
    for (const url of [
      'https://claude.ai.evil.example/',
      'http://claude.ai/',
      'https://claude.ai@evil.example/',
      'https://user:secret@claude.ai/',
      'javascript:alert(1)',
      'https://claude.ai:444/',
    ]) {
      expect(allowedSpikeHost('claude', url)).toBeNull();
    }
  });

  it('reports only a blocked hostname without URL tokens or user info', () => {
    expect(
      blockedSpikeHost(
        'https://user:secret@id.example.org/authorize?code=private',
      ),
    ).toBe('id.example.org');
    expect(blockedSpikeHost('javascript:alert(1)')).toBe(
      'non-HTTPS navigation',
    );
  });
});

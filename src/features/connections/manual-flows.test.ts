import { describe, expect, it } from 'vitest';

import {
  automaticSyncExplanation,
  codexResetAction,
  manualDataLabelText,
  partnerApiWaitingState,
  providerUnavailableExplanation,
} from '@/features/connections/manual-flows';

describe('manual flow copy', () => {
  it('cannot read the Codex action as a quota reset', () => {
    const action = codexResetAction();
    expect(action.label).toBe('View usage and resets');
    expect(action.note).toMatch(/cannot reset or redeem/);
    expect(action.label).not.toMatch(/reset quota/i);
  });

  it('explains unavailable automatic sync in plain language', () => {
    expect(automaticSyncExplanation('claude')).toMatch(/not available yet/);
    expect(automaticSyncExplanation('codex')).toMatch(/not available yet/);
    expect(automaticSyncExplanation('gemini-cli')).toMatch(/not account-wide/);
  });

  it('labels manual data as user-provided and removable', () => {
    expect(manualDataLabelText()).toMatch(/User-provided/);
    expect(manualDataLabelText()).toMatch(/edit or remove/);
  });

  it('describes the dormant partner-API waiting state', () => {
    const waiting = partnerApiWaitingState();
    expect(waiting.title).toBe('Awaiting provider API');
    expect(waiting.description).toMatch(/partner contract/);
  });

  it('explains why each connector cannot sync automatically', () => {
    expect(providerUnavailableExplanation('claude')).toMatch(
      /not available yet/,
    );
    expect(providerUnavailableExplanation('codex')).toMatch(
      /not available yet/,
    );
    expect(providerUnavailableExplanation('gemini-cli')).toMatch(
      /not account-wide/,
    );
    expect(providerUnavailableExplanation('github-copilot')).toMatch(
      /release-disabled/,
    );
    expect(providerUnavailableExplanation('command-code')).toMatch(
      /read-only usage contract/,
    );
    expect(providerUnavailableExplanation('opencode-go')).toMatch(
      /read-only usage contract/,
    );
  });
});

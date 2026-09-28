import { describe, expect, it } from 'vitest';

import {
  currencyOnlyFixture,
  emptyUsageFixture,
  multipleItemsFixture,
  organizationPremiumRequestFixture,
  personalAiCreditFixture,
} from '@/providers/github-copilot/fixtures';
import { normalizeGitHubBilling } from '@/providers/github-copilot/normalize';
import { rawBillingUsageSchema } from '@/providers/github-copilot/schema';

function parse(fixture: string) {
  return rawBillingUsageSchema.parse(JSON.parse(fixture));
}

const NOW = '2026-09-28T00:00:00.000Z';

describe('github billing normalization', () => {
  it('normalizes personal AI credit usage with no entitlement cap', () => {
    const result = normalizeGitHubBilling(parse(personalAiCreditFixture()), {
      scope: 'personal',
      owner: 'octocat',
      kind: 'ai_credit',
      now: NOW,
    });
    const window = result.windows[0];
    expect(window.unit).toBe('credits');
    expect(window.used).toBe('120');
    expect(window.limit).toBeNull();
    expect(window.kind).toBe('monthly');
    expect(window.label).toBe('AI credits');
    expect(window.externalKey).toBe(
      'github.personal.octocat.ai_credit.2026-09',
    );
  });

  it('keeps organization premium requests separate from personal', () => {
    const result = normalizeGitHubBilling(
      parse(organizationPremiumRequestFixture()),
      {
        scope: 'organization',
        owner: 'acme',
        kind: 'premium_request',
        now: NOW,
      },
    );
    const window = result.windows[0];
    expect(window.unit).toBe('requests');
    expect(window.used).toBe('640');
    expect(window.label).toBe('Premium requests (organization)');
    expect(window.externalKey).toContain('github.organization.acme.');
    expect(result.identity?.scope).toBe('organization');
  });

  it('sums multiple line items in decimal arithmetic', () => {
    const result = normalizeGitHubBilling(parse(multipleItemsFixture()), {
      scope: 'personal',
      owner: 'octocat',
      kind: 'premium_request',
      now: NOW,
    });
    expect(result.windows[0].used).toBe('15.5');
  });

  it('reads monetary unit from unitType without converting to counts', () => {
    const result = normalizeGitHubBilling(parse(currencyOnlyFixture()), {
      scope: 'personal',
      owner: 'octocat',
      kind: 'ai_credit',
      now: NOW,
    });
    expect(result.windows[0].unit).toBe('currency');
    expect(result.windows[0].used).toBe('18.5');
    expect(result.windows[0].currencyCode).toBe('USD');
  });

  it('renders empty usage as unknown, not zero', () => {
    const result = normalizeGitHubBilling(parse(emptyUsageFixture()), {
      scope: 'personal',
      owner: 'octocat',
      kind: 'ai_credit',
      now: NOW,
    });
    expect(result.windows[0].used).toBeNull();
    expect(result.windows[0].limit).toBeNull();
    expect(result.windows[0].kind).toBe('billing');
  });
});

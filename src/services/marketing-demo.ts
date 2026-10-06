import { canonicalizeDecimal } from '@/domain/decimal';
import type { ProviderId } from '@/domain/providers';
import type { UsageWindow } from '@/domain/usage';
import type { Database } from '@/storage/database';
import { upsertNotificationRule } from '@/storage/repositories/notifications';
import { saveSessionSnapshot } from '@/services/web-session/session';

/** Reference clock stays fixed for the lifetime of one capture session. */
export const marketingReference = new Date();
const seeded = new WeakMap<Database, Promise<void>>();

function quota(
  key: string,
  label: string,
  percent: number,
  minutes: number,
  kind: UsageWindow['kind'] = 'rolling',
): UsageWindow {
  return {
    externalKey: key,
    kind,
    label,
    used: canonicalizeDecimal(String(percent)),
    limit: canonicalizeDecimal('100'),
    remaining: canonicalizeDecimal(String(100 - percent)),
    utilization: percent / 100,
    unit: 'percent',
    currencyCode: null,
    periodStartsAt: null,
    periodEndsAt: null,
    resetsAt: new Date(
      marketingReference.getTime() + minutes * 60_000,
    ).toISOString(),
    derivation: 'manual',
  };
}

export function seedMarketingDemo(db: Database): Promise<void> {
  const existing = seeded.get(db);
  if (existing) return existing;
  const result = (async () => {
    const providers: {
      id: ProviderId;
      plan: string;
      windows: UsageWindow[];
    }[] = [
      {
        id: 'claude',
        plan: 'Pro',
        windows: [
          quota('five_hour', '5-hour window', 72, 134),
          quota('seven_day', 'Weekly', 46, 4440, 'weekly'),
        ],
      },
      {
        id: 'codex',
        plan: 'Plus',
        windows: [
          quota('primary', '5-hour window', 41, 195),
          quota('secondary', 'Weekly', 28, 3120, 'weekly'),
        ],
      },
      {
        id: 'command-code',
        plan: 'Pro',
        windows: [
          quota('five_hour', '5-hour window', 35, 165),
          quota('weekly', 'Weekly', 52, 5760, 'weekly'),
          quota('monthly', 'Monthly', 24, 14400, 'monthly'),
        ],
      },
      {
        id: 'opencode-go',
        plan: 'Go',
        windows: [
          quota('five_hour', '5-hour window', 18, 252),
          quota('weekly', 'Weekly', 32, 7260, 'weekly'),
        ],
      },
      {
        id: 'github-copilot',
        plan: 'Pro',
        windows: [
          {
            ...quota(
              'premium_requests',
              'Premium requests',
              37,
              14400,
              'monthly',
            ),
            used: canonicalizeDecimal('111'),
            limit: canonicalizeDecimal('300'),
            remaining: canonicalizeDecimal('189'),
            unit: 'requests',
          },
        ],
      },
      {
        id: 'gemini-cli',
        plan: 'AI Pro',
        windows: [
          quota('antigravity.gemini.five_hour', '5-hour window', 28, 210),
          quota('antigravity.gemini.weekly', 'Weekly', 19, 5880, 'weekly'),
          quota('antigravity.claude-gpt.five_hour', '5-hour window', 54, 146),
          quota('antigravity.claude-gpt.weekly', 'Weekly', 36, 4500, 'weekly'),
        ],
      },
    ];
    let ids = 0;
    const timestamp = marketingReference.toISOString();
    for (const provider of providers) {
      await saveSessionSnapshot({
        db,
        providerId: provider.id,
        displayName: `${provider.plan} · sample data`,
        windows: provider.windows,
        fetchedAt: timestamp,
        now: marketingReference,
        authMode: provider.id === 'gemini-cli' ? 'oauth-pkce' : 'web-session',
        nextId: () =>
          `marketing-${marketingReference.getTime()}-${provider.id}-${++ids}`,
      });
    }
    for (const [id, providerId, ruleType] of [
      ['marketing-claude-threshold', 'claude', 'threshold'],
      ['marketing-codex-reset', 'codex', 'reset-reminder'],
    ] as const) {
      await upsertNotificationRule(db, {
        id,
        providerId,
        ruleType,
        enabled: true,
        connectionId: `session-${providerId}`,
        windowExternalKey: providerId === 'claude' ? 'five_hour' : 'primary',
        includeDetails: false,
        threshold: ruleType === 'threshold' ? 0.8 : null,
        leadMinutes: ruleType === 'reset-reminder' ? 15 : null,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  })();
  seeded.set(db, result);
  return result;
}

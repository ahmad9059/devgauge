import { sha256 } from '@noble/hashes/sha2.js';
import { normalizeResetTime } from '@/domain/reset-time';
import type { Database } from '@/storage/database';
import { listConnections } from '@/storage/repositories/connections';
import {
  listNotificationRules,
  upsertNotificationRule,
} from '@/storage/repositories/notifications';
import { latestByConnection } from '@/storage/repositories/usage';
import type { NotificationRuleRecord } from '@/storage/types';
import { withWriteTransaction } from '@/storage/write-transaction';
import {
  listNotificationOperations,
  reconcileNotifications,
  setNotificationIntent,
} from './reconciler';
import type { NotificationScheduler, ReminderRequest } from './scheduler';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateUsageRule(rule: NotificationRuleRecord) {
  if (!rule.providerId) throw new Error('Choose a provider.');
  if (
    rule.ruleType === 'threshold' &&
    (rule.threshold === null ||
      !Number.isFinite(rule.threshold) ||
      rule.threshold <= 0 ||
      rule.threshold > 1)
  )
    throw new Error('Threshold must be between 1 and 100 percent.');
  if (
    rule.ruleType === 'reset-reminder' &&
    (rule.leadMinutes === null ||
      !Number.isInteger(rule.leadMinutes) ||
      rule.leadMinutes < 0 ||
      rule.leadMinutes > 10080)
  )
    throw new Error('Reset lead time must be between 0 and 10080 minutes.');
  if (
    (rule.quietHoursStart === null) !== (rule.quietHoursEnd === null) ||
    (rule.quietHoursStart !== null &&
      (!HHMM.test(rule.quietHoursStart) || !HHMM.test(rule.quietHoursEnd!)))
  )
    throw new Error('Enter both quiet hours as HH:MM, or leave both empty.');
}

/** Quiet hours follow the device timezone; local calendar operations respect DST. */
export function afterQuietHours(
  at: Date,
  start: string | null,
  end: string | null,
): Date {
  if (!start || !end || start === end) return at;
  const minutes = (value: string) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const from = minutes(start),
    to = minutes(end),
    current = at.getHours() * 60 + at.getMinutes();
  const quiet =
    from < to
      ? current >= from && current < to
      : current >= from || current < to;
  if (!quiet) return at;
  const next = new Date(at);
  if (from > to && current >= from) next.setDate(next.getDate() + 1);
  next.setHours(Math.floor(to / 60), to % 60, 0, 0);
  return next;
}

function identity(parts: unknown[]) {
  const key = JSON.stringify(parts);
  // Encode UTF-16 code units explicitly; works in Hermes without a TextEncoder polyfill.
  const bytes = new Uint8Array(key.length * 2);
  for (let i = 0; i < key.length; i++) {
    bytes[i * 2] = key.charCodeAt(i) >>> 8;
    bytes[i * 2 + 1] = key.charCodeAt(i) & 255;
  }
  return [...sha256(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveUsageRule(
  db: Database,
  rule: NotificationRuleRecord,
) {
  validateUsageRule(rule);
  await withWriteTransaction(db, (tx) => upsertNotificationRule(tx, rule));
}

const runs = new WeakMap<Database, Promise<unknown>>();
export function refreshUsageNotifications(
  db: Database,
  scheduler: NotificationScheduler,
  now = new Date(),
) {
  const previous = runs.get(db) ?? Promise.resolve();
  const run = previous.then(
    () => refresh(db, scheduler, now),
    () => refresh(db, scheduler, now),
  );
  runs.set(db, run);
  void run
    .finally(() => {
      if (runs.get(db) === run) runs.delete(db);
    })
    .catch(() => undefined);
  return run;
}

async function refresh(
  db: Database,
  scheduler: NotificationScheduler,
  now: Date,
) {
  const [rules, connections, latest, operations] = await Promise.all([
    listNotificationRules(db),
    listConnections(db),
    latestByConnection(db),
    listNotificationOperations(db),
  ]);
  const existing = new Map(
    operations.map((operation) => [operation.id, operation]),
  );
  const desired = new Map<
    string,
    { ruleId: string; connectionId: string; request: ReminderRequest }
  >();
  const activeRuleIds = rules
    .filter((rule) => !rule.id.startsWith('reset-rule-'))
    .map((rule) => rule.id);
  for (const rule of rules) {
    if (!rule.enabled || rule.id.startsWith('reset-rule-')) continue;
    try {
      validateUsageRule(rule);
    } catch {
      continue;
    }
    for (const connection of connections) {
      if (
        connection.providerId !== rule.providerId ||
        ['disconnected', 'disabled'].includes(connection.status) ||
        (rule.connectionId && rule.connectionId !== connection.id)
      )
        continue;
      const snapshot = latest.get(connection.id);
      if (!snapshot) continue;
      for (const window of snapshot.windows) {
        if (
          rule.windowExternalKey &&
          rule.windowExternalKey !== window.externalKey
        )
          continue;
        const reset = normalizeResetTime(
          window.resetsAt,
          new Date(snapshot.fetchedAt),
        );
        const cycle =
          reset ?? window.periodEndsAt ?? window.periodStartsAt ?? 'unknown';
        let fireAt: Date;
        let id: string;
        if (rule.ruleType === 'threshold') {
          if (
            window.utilization === null ||
            !Number.isFinite(window.utilization) ||
            window.utilization < rule.threshold!
          )
            continue;
          if (reset && Date.parse(reset) <= now.getTime()) continue; // stale cycle awaiting fresh usage
          id = `threshold-${identity([rule.id, connection.id, window.externalKey, cycle])}`;
          const prior = existing.get(`devgauge.reminder.${id}`);
          // Enabling while above threshold alerts once; edits never repeat the same cycle.
          if (prior) {
            if (prior.desired)
              desired.set(prior.id, {
                ruleId: rule.id,
                connectionId: connection.id,
                request: JSON.parse(prior.request_json),
              });
            continue;
          }
          fireAt = afterQuietHours(
            new Date(now.getTime() + 3000),
            rule.quietHoursStart,
            rule.quietHoursEnd,
          );
          if (reset && fireAt.getTime() >= Date.parse(reset)) continue;
        } else {
          if (!reset || Date.parse(reset) <= now.getTime()) continue;
          id = `reset-${identity([rule.id, connection.id, window.externalKey, reset])}`;
          fireAt = afterQuietHours(
            new Date(
              Math.max(
                now.getTime() + 3000,
                Date.parse(reset) - rule.leadMinutes! * 60000,
              ),
            ),
            rule.quietHoursStart,
            rule.quietHoursEnd,
          );
        }
        const prior = existing.get(`devgauge.reminder.${id}`);
        if (rule.ruleType === 'reset-reminder' && prior) {
          const priorRequest = JSON.parse(
            prior.request_json,
          ) as ReminderRequest;
          // A fired/missed reminder stays deduplicated until the provider reports a new reset cycle.
          if (Date.parse(priorRequest.at) <= now.getTime())
            fireAt = new Date(priorRequest.at);
        }
        const detailed = rule.includeDetails
          ? `${connection.providerId} · ${window.label}: `
          : '';
        const request: ReminderRequest = {
          id,
          title: 'DevGauge',
          providerId: connection.providerId,
          at: fireAt.toISOString(),
          body:
            detailed +
            (rule.ruleType === 'threshold'
              ? 'A usage window reached your threshold.'
              : 'Check your provider’s scheduled usage reset.'),
        };
        desired.set(`devgauge.reminder.${id}`, {
          ruleId: rule.id,
          connectionId: connection.id,
          request,
        });
      }
    }
  }
  await withWriteTransaction(db, async (tx) => {
    for (const operation of operations) {
      if (
        activeRuleIds.includes(operation.rule_id) &&
        !desired.has(operation.id) &&
        operation.desired
      )
        await tx.run(
          "UPDATE notification_operations SET desired=0,state='pending',updated_at=? WHERE id=?",
          [now.toISOString(), operation.id],
        );
    }
    for (const [id, intent] of desired) {
      if (
        existing.get(id)?.request_json === JSON.stringify(intent.request) &&
        existing.get(id)?.desired
      )
        continue;
      await setNotificationIntent(tx, { ...intent, now: now.toISOString() });
    }
  });
  return reconcileNotifications(db, scheduler, now);
}

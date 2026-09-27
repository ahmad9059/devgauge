import type { ProviderId } from '@/domain/providers';
import type { Database } from '@/storage/database';
import type {
  NotificationRuleRecord,
  ScheduledNotificationRecord,
} from '@/storage/types';

type RuleRow = {
  id: string;
  provider_id: string | null;
  rule_type: string;
  enabled: number;
  threshold: number | null;
  lead_minutes: number | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
};

type ScheduledRow = {
  id: string;
  rule_id: string;
  connection_id: string | null;
  window_external_key: string | null;
  native_identifier: string;
  scheduled_for: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const RULE_COLUMNS = `id, provider_id, rule_type, enabled, threshold,
  lead_minutes, quiet_hours_start, quiet_hours_end, created_at, updated_at`;
const SCHEDULED_COLUMNS = `id, rule_id, connection_id, window_external_key,
  native_identifier, scheduled_for, status, created_at, updated_at`;

function toRule(row: RuleRow): NotificationRuleRecord {
  return {
    id: row.id,
    providerId: row.provider_id as ProviderId | null,
    ruleType: row.rule_type as NotificationRuleRecord['ruleType'],
    enabled: row.enabled === 1,
    threshold: row.threshold,
    leadMinutes: row.lead_minutes,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toScheduled(row: ScheduledRow): ScheduledNotificationRecord {
  return {
    id: row.id,
    ruleId: row.rule_id,
    connectionId: row.connection_id,
    windowExternalKey: row.window_external_key,
    nativeIdentifier: row.native_identifier,
    scheduledFor: row.scheduled_for,
    status: row.status as ScheduledNotificationRecord['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotificationRules(
  db: Database,
): Promise<NotificationRuleRecord[]> {
  const rows = await db.all<RuleRow>(
    `SELECT ${RULE_COLUMNS} FROM notification_rules ORDER BY created_at ASC, id ASC`,
  );
  return rows.map(toRule);
}

export async function upsertNotificationRule(
  db: Database,
  rule: NotificationRuleRecord,
): Promise<void> {
  await db.run(
    `INSERT INTO notification_rules (${RULE_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       provider_id = excluded.provider_id, rule_type = excluded.rule_type,
       enabled = excluded.enabled, threshold = excluded.threshold,
       lead_minutes = excluded.lead_minutes,
       quiet_hours_start = excluded.quiet_hours_start,
       quiet_hours_end = excluded.quiet_hours_end,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [
      rule.id,
      rule.providerId,
      rule.ruleType,
      rule.enabled ? 1 : 0,
      rule.threshold,
      rule.leadMinutes,
      rule.quietHoursStart,
      rule.quietHoursEnd,
      rule.createdAt,
      rule.updatedAt,
    ],
  );
}

export async function deleteNotificationRule(
  db: Database,
  id: string,
): Promise<void> {
  await db.run('DELETE FROM notification_rules WHERE id = ?', [id]);
}

export async function listScheduledNotifications(
  db: Database,
): Promise<ScheduledNotificationRecord[]> {
  const rows = await db.all<ScheduledRow>(
    `SELECT ${SCHEDULED_COLUMNS} FROM scheduled_notifications
     ORDER BY scheduled_for ASC, id ASC`,
  );
  return rows.map(toScheduled);
}

export async function upsertScheduledNotification(
  db: Database,
  record: ScheduledNotificationRecord,
): Promise<void> {
  await db.run(
    `INSERT INTO scheduled_notifications (${SCHEDULED_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       rule_id = excluded.rule_id, connection_id = excluded.connection_id,
       window_external_key = excluded.window_external_key,
       native_identifier = excluded.native_identifier,
       scheduled_for = excluded.scheduled_for, status = excluded.status,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [
      record.id,
      record.ruleId,
      record.connectionId,
      record.windowExternalKey,
      record.nativeIdentifier,
      record.scheduledFor,
      record.status,
      record.createdAt,
      record.updatedAt,
    ],
  );
}

/** Marks a connection's pending schedules cancelled; returns rows affected. */
export async function cancelScheduledForConnection(
  db: Database,
  connectionId: string,
  nowIso: string,
): Promise<number> {
  const result = await db.run(
    `UPDATE scheduled_notifications
     SET status = 'cancelled', updated_at = ?
     WHERE connection_id = ? AND status = 'scheduled'`,
    [nowIso, connectionId],
  );
  return result.changes;
}

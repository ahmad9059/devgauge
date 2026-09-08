import type { AlertEvent, AlertKind, AlertRule, AlertRuleInput, ProviderId, ProviderUsage } from "@devgauge/contracts";

import type { Db } from "../client.js";

interface AlertRuleRow {
  id: string;
  provider: ProviderId | null;
  windowId: string | null;
  kind: AlertKind;
  threshold: number | string | null;
  hysteresis: number | string;
  enabled: boolean;
  critical: boolean;
  previewMode: AlertRule["preview"];
  quietHours: AlertRule["quietHours"];
  createdAt: Date;
  updatedAt: Date;
}

const mapRule = (row: AlertRuleRow): AlertRule => ({
  id: row.id,
  provider: row.provider,
  windowId: row.windowId,
  kind: row.kind,
  threshold: row.threshold === null ? null : Number(row.threshold),
  hysteresis: Number(row.hysteresis),
  enabled: row.enabled,
  critical: row.critical,
  preview: row.previewMode,
  quietHours: row.quietHours,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listAlertRules = async (db: Db, userId: string): Promise<AlertRule[]> => {
  const rows = await db`select * from alert_rules where user_id = ${userId} order by created_at desc`;
  return rows.map((row) => mapRule(row as unknown as AlertRuleRow));
};

export const createAlertRule = async (db: Db, userId: string, input: AlertRuleInput): Promise<AlertRule> => {
  const rows = await db`
    insert into alert_rules (
      user_id, provider, window_id, kind, threshold, enabled, quiet_hours,
      hysteresis, critical, preview_mode
    ) values (
      ${userId}, ${input.provider}, ${input.windowId}, ${input.kind}, ${input.threshold},
      ${input.enabled}, ${input.quietHours ? db.json(input.quietHours) : null},
      ${input.hysteresis}, ${input.critical}, ${input.preview}
    ) returning *
  `;
  return mapRule(rows[0] as unknown as AlertRuleRow);
};

export const updateOwnedAlertRule = async (
  db: Db,
  id: string,
  userId: string,
  input: AlertRuleInput
): Promise<AlertRule | undefined> => {
  const rows = await db`
    update alert_rules set provider = ${input.provider}, window_id = ${input.windowId},
      kind = ${input.kind}, threshold = ${input.threshold}, enabled = ${input.enabled},
      quiet_hours = ${input.quietHours ? db.json(input.quietHours) : null},
      hysteresis = ${input.hysteresis}, critical = ${input.critical},
      preview_mode = ${input.preview}, updated_at = now()
    where id = ${id} and user_id = ${userId}
    returning *
  `;
  return rows[0] ? mapRule(rows[0] as unknown as AlertRuleRow) : undefined;
};

export const deleteOwnedAlertRule = async (db: Db, id: string, userId: string): Promise<boolean> => {
  const rows = await db`delete from alert_rules where id = ${id} and user_id = ${userId} returning id`;
  return rows.length === 1;
};

interface AlertEventRow {
  id: string;
  ruleId: string | null;
  provider: ProviderId | null;
  windowId: string | null;
  kind: AlertKind;
  severity: AlertEvent["severity"];
  title: string;
  body: string;
  occurredAt: Date;
  deliverAfter: Date;
  acknowledgedAt: Date | null;
}

const mapEvent = (row: AlertEventRow): AlertEvent => ({
  ...row,
  occurredAt: row.occurredAt.toISOString(),
  deliverAfter: row.deliverAfter.toISOString(),
  acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
});

export const listAlertEvents = async (db: Db, userId: string, limit = 50): Promise<AlertEvent[]> => {
  const rows = await db`
    select * from alert_events where user_id = ${userId}
    order by occurred_at desc limit ${Math.min(Math.max(limit, 1), 100)}
  `;
  return rows.map((row) => mapEvent(row as unknown as AlertEventRow));
};

export const acknowledgeAlertEvent = async (db: Db, id: string, userId: string): Promise<boolean> => {
  const rows = await db`
    update alert_events set acknowledged_at = coalesce(acknowledged_at, now())
    where id = ${id} and user_id = ${userId} returning id
  `;
  return rows.length === 1;
};

const eventCopy = (kind: AlertKind, provider: ProviderId, label: string): Pick<AlertEventRow, "severity" | "title" | "body"> => {
  if (kind === "provider_limited") return { severity: "critical", title: "Provider limit reached", body: `${provider} ${label} is currently limited.` };
  if (kind === "data_stale") return { severity: "warning", title: "Usage data is stale", body: `${provider} has not provided a fresh update.` };
  if (kind === "remaining_threshold") return { severity: "warning", title: "Allowance is running low", body: `${provider} ${label} crossed your remaining threshold.` };
  return { severity: "warning", title: "Usage threshold reached", body: `${provider} ${label} crossed your alert threshold.` };
};

export const evaluateUsageAlerts = async (
  db: Db,
  input: { userId: string; connectionId: string; snapshotId: string; usage: ProviderUsage }
): Promise<number> => {
  const rules = (await db`
    select * from alert_rules where user_id = ${input.userId} and enabled = true
      and (provider is null or provider = ${input.usage.provider})
  `).map((row) => mapRule(row as unknown as AlertRuleRow));
  let created = 0;

  for (const rule of rules) {
    const windows = input.usage.windows.filter((window) => !rule.windowId || window.id === rule.windowId);
    for (const window of windows) {
      const observed = rule.kind === "remaining_threshold" ? window.remainingPercent : window.usedPercent;
      const triggered = rule.kind === "provider_limited"
        ? window.state === "limited"
        : rule.kind === "data_stale"
          ? input.usage.stale
          : rule.kind === "consumed_threshold"
            ? observed !== null && rule.threshold !== null && observed >= rule.threshold
            : rule.kind === "remaining_threshold"
              ? observed !== null && rule.threshold !== null && observed <= rule.threshold
              : false;
      const cycleKey = window.resetsAt ?? input.usage.fetchedAt.slice(0, 10);
      const stateRows = await db`
        select cycle_key, armed from alert_rule_state
        where rule_id = ${rule.id} and connection_id = ${input.connectionId} and window_id = ${window.id}
      `;
      const state = stateRows[0] as unknown as { cycleKey: string; armed: boolean } | undefined;
      const armed = !state || state.cycleKey !== cycleKey || state.armed;
      const rearmed = observed !== null && rule.threshold !== null && (
        rule.kind === "remaining_threshold"
          ? observed >= rule.threshold + rule.hysteresis
          : observed <= rule.threshold - rule.hysteresis
      );

      if (triggered && armed) {
        const copy = eventCopy(rule.kind, input.usage.provider, window.label);
        const dedupeKey = `${rule.id}:${input.connectionId}:${window.id}:${cycleKey}`;
        const rows = await db`
          insert into alert_events (
            user_id, rule_id, connection_id, provider, window_id, kind, severity,
            title, body, cycle_key, dedupe_key
          ) values (
            ${input.userId}, ${rule.id}, ${input.connectionId}, ${input.usage.provider},
            ${window.id}, ${rule.kind}, ${copy.severity}, ${copy.title}, ${copy.body},
            ${cycleKey}, ${dedupeKey}
          ) on conflict (dedupe_key) do nothing returning id
        `;
        created += rows.length;
      }

      await db`
        insert into alert_rule_state (
          rule_id, connection_id, window_id, cycle_key, armed, last_observed_value,
          last_snapshot_id, last_fired_at
        ) values (
          ${rule.id}, ${input.connectionId}, ${window.id}, ${cycleKey},
          ${triggered ? false : rearmed || armed}, ${observed}, ${input.snapshotId},
          ${triggered && armed ? new Date() : null}
        ) on conflict (rule_id, connection_id, window_id) do update set
          cycle_key = excluded.cycle_key,
          armed = excluded.armed,
          last_observed_value = excluded.last_observed_value,
          last_snapshot_id = excluded.last_snapshot_id,
          last_fired_at = coalesce(excluded.last_fired_at, alert_rule_state.last_fired_at),
          updated_at = now()
      `;
    }
  }
  return created;
};

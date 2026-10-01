import type { Migration } from './types';

/** The journal survives parent deletion until native cancellation succeeds. */
export const migration0003: Migration = {
  version: 3,
  name: 'notification-operation-journal',
  sql: `CREATE TABLE notification_operations (
    id TEXT PRIMARY KEY NOT NULL,
    rule_id TEXT NOT NULL,
    connection_id TEXT,
    request_json TEXT NOT NULL,
    desired INTEGER NOT NULL CHECK (desired IN (0,1)),
    state TEXT NOT NULL CHECK (state IN ('pending','scheduled','denied','failed','cancelled','elapsed')),
    safe_error TEXT,
    updated_at TEXT NOT NULL
  );
  INSERT INTO notification_operations
    (id,rule_id,connection_id,request_json,desired,state,safe_error,updated_at)
  SELECT s.native_identifier,s.rule_id,s.connection_id,
    json_object('id',substr(s.native_identifier,19),'title','DevGauge reminder',
      'body','A usage window is resetting soon.','at',s.scheduled_for,'providerId',r.provider_id),
    CASE WHEN s.status = 'scheduled' AND r.enabled = 1 THEN 1 ELSE 0 END,
    CASE WHEN s.status = 'scheduled' THEN 'pending' ELSE 'cancelled' END,
    NULL,s.updated_at
  FROM scheduled_notifications s JOIN notification_rules r ON r.id = s.rule_id
  WHERE s.native_identifier LIKE 'devgauge.reminder.%';`,
};

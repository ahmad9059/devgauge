import type { Migration } from './types';

export const migration0004: Migration = {
  version: 4,
  name: 'notification-rule-scopes',
  sql: `ALTER TABLE notification_rules ADD COLUMN connection_id TEXT;
    ALTER TABLE notification_rules ADD COLUMN window_external_key TEXT;
    ALTER TABLE notification_rules ADD COLUMN include_details INTEGER NOT NULL DEFAULT 0
      CHECK (include_details IN (0,1));`,
};

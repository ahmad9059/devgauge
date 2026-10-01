import type { Migration } from './types';

export const migration0002: Migration = {
  version: 2,
  name: 'preserve-reset-source-text',
  sql: `ALTER TABLE usage_windows ADD COLUMN resets_source_text TEXT;
        UPDATE usage_windows SET resets_source_text = resets_at WHERE resets_at IS NOT NULL;`,
};

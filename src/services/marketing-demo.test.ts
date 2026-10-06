import { describe, expect, it } from 'vitest';
import { createMigratedTestDatabase } from '@/testing/storage/database';
import { listConnections } from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import { listNotificationRules } from '@/storage/repositories/notifications';
import { buildProviderViews } from '@/features/dashboard/provider-views';
import { listProviderDescriptors } from '@/providers/registry';
import { marketingReference, seedMarketingDemo } from './marketing-demo';

describe('marketing capture data', () => {
  it('persists labeled, credential-free samples that render through real view models', async () => {
    const db = await createMigratedTestDatabase();
    try {
      await Promise.all([seedMarketingDemo(db), seedMarketingDemo(db)]);
      const connections = await listConnections(db);
      const latest = await latestByConnection(db);
      expect(connections).toHaveLength(6);
      expect(latest.size).toBe(6);
      expect(
        connections.every(
          (item) =>
            item.displayName?.includes('sample data') &&
            item.credentialRef === null &&
            item.accountHint === null,
        ),
      ).toBe(true);
      const views = buildProviderViews({
        descriptors: listProviderDescriptors(),
        connections,
        latest,
        now: marketingReference,
      });
      expect(views.every((provider) => provider.state === 'connected')).toBe(
        true,
      );
      expect(
        views.find((provider) => provider.id === 'claude')?.windows[0],
      ).toMatchObject({ percent: 72, resetsInMinutes: 134 });
      expect(await listNotificationRules(db)).toHaveLength(2);
    } finally {
      await db.close();
    }
  });
});

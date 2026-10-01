import type { Database } from '@/storage/database';
import { withWriteTransaction } from '@/storage/write-transaction';
import type { NotificationCanceller } from '@/services/local-data';
import { reconcileNotifications } from './reconciler';
import type { NotificationScheduler } from './scheduler';

export function createNotificationCanceller(
  db: Database,
  scheduler: NotificationScheduler,
): NotificationCanceller {
  const cancel = async (connectionId?: string) => {
    await withWriteTransaction(db, (tx) =>
      tx.run(
        `UPDATE notification_operations SET desired=0,state='pending'${connectionId ? ' WHERE connection_id=?' : ''}`,
        connectionId ? [connectionId] : [],
      ),
    );
    const operations = await reconcileNotifications(db, scheduler);
    if (
      operations.some(
        (item) =>
          item.state === 'failed' &&
          (!connectionId || item.connection_id === connectionId),
      )
    )
      throw new Error(
        'Native reminder cancellation is pending. Retry before deleting local data.',
      );
  };
  return { cancelForConnection: (id) => cancel(id), cancelAll: () => cancel() };
}

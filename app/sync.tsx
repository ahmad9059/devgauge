import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSyncStatus } from '@/features/dashboard/sync-provider';

/** Legacy deep links use the mounted coordinator and leave cached cards visible. */
export default function SyncScreen() {
  const router = useRouter();
  const { startSync } = useSyncStatus();
  useEffect(() => {
    void startSync().catch(() => undefined);
    router.replace('/(tabs)/usage');
  }, [router, startSync]);
  return null;
}

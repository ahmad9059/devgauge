import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import type { ProviderState } from '@/features/dashboard/provider-view-types';

import { useProviderViews } from './app-providers';

const SYNCABLE: ProviderState[] = [
  'connected',
  'stale',
  'rate-limited',
  'auth-expired',
  'error',
];

// Runs once per app session so reopening the app refreshes every provider.
let ranThisSession = false;

/**
 * Auto-refreshes all connected providers once when the app opens. It navigates
 * to the sync screen only when there is at least one connection.
 */
export function AutoSyncOnOpen() {
  const router = useRouter();
  const providers = useProviderViews();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current || ranThisSession) return;
    const hasConnection = providers.some((provider) =>
      SYNCABLE.includes(provider.state),
    );
    if (!hasConnection) return;
    triggered.current = true;
    ranThisSession = true;
    router.push('/sync');
  }, [providers, router]);

  return null;
}

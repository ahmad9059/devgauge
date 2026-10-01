import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { AppState } from 'react-native';
import { startForegroundClock } from './foreground-clock';

import { listProviderDescriptors } from '@/providers/registry';
import { getAppDatabase } from '@/services/app-database-store';
import { listConnections } from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import type { ProviderConnection, SnapshotWithWindows } from '@/storage/types';
import type { ProviderView } from '@/features/dashboard/provider-view-types';

import { buildProviderViews } from './provider-views';
import { createCoalescedReload } from './coalesced-reload';

type AppProvidersValue = {
  providers: ProviderView[];
  ready: boolean;
  reload: () => Promise<void>;
};

const AppProvidersContext = createContext<AppProvidersValue | null>(null);

function gatedOnly(): ProviderView[] {
  return buildProviderViews({
    descriptors: listProviderDescriptors(),
    connections: [],
    latest: new Map(),
    now: new Date(),
  });
}

/**
 * Loads the real provider list from the encrypted database (connections +
 * latest snapshots), derives each provider's state from the registry, and can
 * reload after a connection change. There is no static/mock usage data.
 */
export function AppProvidersProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [latest, setLatest] = useState<Map<string, SnapshotWithWindows>>(
    () => new Map(),
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(
    () =>
      startForegroundClock(setNow, {
        isActive: () => AppState.currentState === 'active',
        subscribe: (listener) => {
          const subscription = AppState.addEventListener('change', (state) =>
            listener(state === 'active'),
          );
          return () => subscription.remove();
        },
      }),
    [],
  );
  const [ready, setReady] = useState(false);

  const [reload] = useState(() =>
    createCoalescedReload(async () => {
      try {
        const db = await getAppDatabase();
        const storedConnections = await listConnections(db);
        const snapshots = await latestByConnection(db);
        setConnections(storedConnections);
        setLatest(snapshots);
      } finally {
        setReady(true);
      }
    }),
  );

  useEffect(() => {
    let active = true;
    reload().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [reload]);

  const value = useMemo<AppProvidersValue>(
    () => ({
      providers: buildProviderViews({
        descriptors: listProviderDescriptors(),
        connections,
        latest,
        now,
      }),
      ready,
      reload,
    }),
    [connections, latest, ready, reload, now],
  );

  return (
    <AppProvidersContext.Provider value={value}>
      {children}
    </AppProvidersContext.Provider>
  );
}

export function useProviderViews(): ProviderView[] {
  const context = useContext(AppProvidersContext);
  return context ? context.providers : gatedOnly();
}

/** Reloads provider views after a connection changes (demo/manual flows). */
export function useReloadProviders(): () => Promise<void> {
  const context = useContext(AppProvidersContext);
  return context ? context.reload : async () => undefined;
}

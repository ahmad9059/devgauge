import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { listProviderDescriptors } from '@/providers/registry';
import { getAppDatabase } from '@/services/app-database-store';
import { listConnections } from '@/storage/repositories/connections';
import { latestByConnection } from '@/storage/repositories/usage';
import type { ProviderConnection, SnapshotWithWindows } from '@/storage/types';
import type { ProviderFixture } from '@/testing/fixtures/providers';

import { buildProviderViews } from './provider-views';

type AppProvidersValue = {
  providers: ProviderFixture[];
  ready: boolean;
};

const AppProvidersContext = createContext<AppProvidersValue | null>(null);

function gatedOnly(): ProviderFixture[] {
  return buildProviderViews({
    descriptors: listProviderDescriptors(),
    connections: [],
    latest: new Map(),
    now: new Date(),
  });
}

/**
 * Loads the real provider list from the encrypted database (connections +
 * latest snapshots) once, and derives each provider's state from the registry.
 * There is no static/mock usage data. If the database is unavailable the app
 * falls back to the registry's gated states and stays usable.
 */
export function AppProvidersProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [latest, setLatest] = useState<Map<string, SnapshotWithWindows>>(
    () => new Map(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getAppDatabase()
      .then(async (db) => {
        const storedConnections = await listConnections(db);
        const snapshots = await latestByConnection(db);
        if (!active) return;
        setConnections(storedConnections);
        setLatest(snapshots);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AppProvidersValue>(
    () => ({
      providers: buildProviderViews({
        descriptors: listProviderDescriptors(),
        connections,
        latest,
        now: new Date(),
      }),
      ready,
    }),
    [connections, latest, ready],
  );

  return (
    <AppProvidersContext.Provider value={value}>
      {children}
    </AppProvidersContext.Provider>
  );
}

export function useProviderViews(): ProviderFixture[] {
  const context = useContext(AppProvidersContext);
  return context ? context.providers : gatedOnly();
}

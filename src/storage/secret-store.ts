// Key/value secret storage. The memory implementation backs unit tests; the
// Android Keystore-backed implementation lives in `secure-store-backend.ts`.

export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface MemorySecretStore extends SecretStore {
  entries(): Record<string, string>;
  readonly size: number;
}

export function createMemorySecretStore(
  seed: Record<string, string> = {},
): MemorySecretStore {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    entries() {
      return Object.fromEntries(map);
    },
    get size() {
      return map.size;
    },
  };
}

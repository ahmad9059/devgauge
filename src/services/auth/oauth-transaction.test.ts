import { describe, expect, it } from 'vitest';

import {
  OAuthTransactionError,
  OAuthTransactionStore,
} from '@/services/auth/oauth-transaction';

const REDIRECT = 'devgauge://auth/callback/github-copilot';
const randomBytes = async (length: number) =>
  new Uint8Array(Array.from({ length }, (_, index) => (index * 3 + 5) % 256));

function makeStore(ttlMs = 300_000) {
  let counter = 0;
  let current = new Date('2026-09-28T00:00:00.000Z');
  const store = new OAuthTransactionStore({
    nextId: () => `txn-${(counter += 1)}`,
    randomBytes,
    clock: () => current,
    ttlMs,
  });
  return {
    store,
    advance: (ms: number) => (current = new Date(current.getTime() + ms)),
  };
}

describe('oauth transaction store', () => {
  it('creates and consumes a transaction exactly once', async () => {
    const { store } = makeStore();
    const transaction = await store.create({
      provider: 'github-copilot',
      redirectUri: REDIRECT,
    });
    expect(transaction.codeVerifier).toHaveLength(43);

    const consumed = store.consume({
      transactionId: transaction.id,
      state: transaction.state,
      redirectUri: REDIRECT,
    });
    expect(consumed.consumedAt).not.toBeNull();
  });

  it('rejects replay of a consumed transaction', async () => {
    const { store } = makeStore();
    const transaction = await store.create({
      provider: 'github-copilot',
      redirectUri: REDIRECT,
    });
    store.consume({ transactionId: transaction.id, state: transaction.state });
    expect(() =>
      store.consume({
        transactionId: transaction.id,
        state: transaction.state,
      }),
    ).toThrow(OAuthTransactionError);
    try {
      store.consume({
        transactionId: transaction.id,
        state: transaction.state,
      });
    } catch (error) {
      expect((error as OAuthTransactionError).reason).toBe('consumed');
    }
  });

  it('rejects a state mismatch', async () => {
    const { store } = makeStore();
    const transaction = await store.create({
      provider: 'github-copilot',
      redirectUri: REDIRECT,
    });
    try {
      store.consume({ transactionId: transaction.id, state: 'wrong' });
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as OAuthTransactionError).reason).toBe('state-mismatch');
    }
  });

  it('rejects a redirect mismatch', async () => {
    const { store } = makeStore();
    const transaction = await store.create({
      provider: 'github-copilot',
      redirectUri: REDIRECT,
    });
    try {
      store.consume({
        transactionId: transaction.id,
        state: transaction.state,
        redirectUri: 'https://evil.test/callback',
      });
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as OAuthTransactionError).reason).toBe('redirect-mismatch');
    }
  });

  it('rejects an expired transaction', async () => {
    const { store, advance } = makeStore(60_000);
    const transaction = await store.create({
      provider: 'github-copilot',
      redirectUri: REDIRECT,
    });
    advance(61_000);
    try {
      store.consume({
        transactionId: transaction.id,
        state: transaction.state,
      });
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as OAuthTransactionError).reason).toBe('expired');
    }
  });

  it('rejects an unknown transaction', () => {
    const { store } = makeStore();
    expect(() =>
      store.consume({ transactionId: 'missing', state: 'x' }),
    ).toThrow(/Unknown/);
  });
});

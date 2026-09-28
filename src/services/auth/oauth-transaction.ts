import { createCodeVerifier, createState, type RandomBytes } from './pkce';

export type OAuthTransactionProvider = 'github-copilot';

export type OAuthTransaction = {
  id: string;
  provider: OAuthTransactionProvider;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type OAuthTransactionErrorReason =
  'unknown' | 'expired' | 'consumed' | 'state-mismatch' | 'redirect-mismatch';

export class OAuthTransactionError extends Error {
  readonly reason: OAuthTransactionErrorReason;

  constructor(reason: OAuthTransactionErrorReason, message: string) {
    super(message);
    this.name = 'OAuthTransactionError';
    this.reason = reason;
  }
}

export type TransactionStoreDependencies = {
  nextId: () => string;
  randomBytes: RandomBytes;
  clock?: () => Date;
  ttlMs?: number;
};

export const DEFAULT_TRANSACTION_TTL_MS = 5 * 60 * 1000;

export type CreateTransactionInput = {
  provider: OAuthTransactionProvider;
  redirectUri: string;
};

/**
 * In-memory, single-use, time-boxed OAuth transaction store. Each transaction
 * binds a state value, a PKCE verifier, the provider, and the exact redirect
 * URI; consuming it is atomic against replay.
 */
export class OAuthTransactionStore {
  private readonly transactions = new Map<string, OAuthTransaction>();
  private readonly deps: Required<TransactionStoreDependencies>;

  constructor(dependencies: TransactionStoreDependencies) {
    this.deps = {
      clock: () => new Date(),
      ttlMs: DEFAULT_TRANSACTION_TTL_MS,
      ...dependencies,
    };
  }

  async create(input: CreateTransactionInput): Promise<OAuthTransaction> {
    const now = this.deps.clock();
    const transaction: OAuthTransaction = {
      id: this.deps.nextId(),
      provider: input.provider,
      state: await createState(this.deps.randomBytes),
      codeVerifier: await createCodeVerifier(this.deps.randomBytes),
      redirectUri: input.redirectUri,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.deps.ttlMs).toISOString(),
      consumedAt: null,
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  peek(id: string): OAuthTransaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Validates and atomically consumes a transaction. Throws a typed error and
   * never returns token material on mismatch, expiry, or replay.
   */
  consume(input: {
    transactionId: string;
    state: string;
    redirectUri?: string;
  }): OAuthTransaction {
    const transaction = this.transactions.get(input.transactionId);
    if (!transaction) {
      throw new OAuthTransactionError('unknown', 'Unknown transaction');
    }
    if (transaction.consumedAt !== null) {
      throw new OAuthTransactionError(
        'consumed',
        'Transaction already consumed',
      );
    }
    if (this.deps.clock().getTime() > Date.parse(transaction.expiresAt)) {
      throw new OAuthTransactionError('expired', 'Transaction expired');
    }
    if (transaction.state !== input.state) {
      throw new OAuthTransactionError('state-mismatch', 'State mismatch');
    }
    if (
      input.redirectUri !== undefined &&
      transaction.redirectUri !== input.redirectUri
    ) {
      throw new OAuthTransactionError(
        'redirect-mismatch',
        'Redirect URI mismatch',
      );
    }
    transaction.consumedAt = this.deps.clock().toISOString();
    return transaction;
  }
}

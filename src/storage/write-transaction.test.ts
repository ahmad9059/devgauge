import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '@/testing/storage/database';
import { withWriteTransaction } from './write-transaction';

describe('shared repository write queue', () => {
  it('queues a separately completed provider behind an active native write and recovers after failure', async () => {
    const db = createTestDatabase();
    await db.exec('CREATE TABLE t (id TEXT)');
    let release!: () => void;
    let entered!: () => void;
    const active = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = withWriteTransaction(db, async (tx) => {
      await tx.run("INSERT INTO t VALUES ('first')");
      entered();
      await gate;
      throw new Error('injected failure');
    });
    const rejection = expect(first).rejects.toThrow('injected failure');
    await active;
    const second = withWriteTransaction(db, (tx) =>
      tx.run("INSERT INTO t VALUES ('second')"),
    );
    release();
    await rejection;
    await second;
    expect(await db.all('SELECT id FROM t')).toEqual([{ id: 'second' }]);
  });
});

import { describe, expect, it } from 'vitest';

import { configureDatabase, createDatabase } from '@/storage/database';
import { createNodeSqliteDriver } from '@/testing/storage/node-driver';
import { DatabaseSync } from 'node:sqlite';

function freshDb() {
  return createDatabase(createNodeSqliteDriver(new DatabaseSync(':memory:')));
}

describe('database wrapper', () => {
  it('enables foreign keys and a configurable busy timeout', async () => {
    const db = freshDb();
    await configureDatabase(db, { journalModeWAL: false, busyTimeoutMs: 2500 });
    const fk = await db.first<{ foreign_keys: number }>('PRAGMA foreign_keys');
    const busy = await db.first<{ timeout: number }>('PRAGMA busy_timeout');
    expect(fk?.foreign_keys).toBe(1);
    expect(busy?.timeout).toBe(2500);
  });

  it('rejects an invalid busy timeout', async () => {
    const db = freshDb();
    await expect(configureDatabase(db, { busyTimeoutMs: -1 })).rejects.toThrow(
      /busyTimeoutMs/,
    );
  });

  it('commits a successful transaction', async () => {
    const db = freshDb();
    await db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, v TEXT)');
    await db.transaction(async (tx) => {
      await tx.run('INSERT INTO t (id, v) VALUES (?, ?)', ['a', '1']);
    });
    const row = await db.first<{ v: string }>('SELECT v FROM t WHERE id = ?', [
      'a',
    ]);
    expect(row?.v).toBe('1');
  });

  it('rolls back a failed transaction and leaves no partial writes', async () => {
    const db = freshDb();
    await db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, v TEXT)');
    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO t (id, v) VALUES (?, ?)', ['a', '1']);
        await tx.run('INSERT INTO t (id, v) VALUES (?, ?)', ['b', '2']);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const count = await db.first<{ c: number }>('SELECT COUNT(*) AS c FROM t');
    expect(count?.c).toBe(0);
  });

  it('rejects nested transactions to avoid deadlock', async () => {
    const db = freshDb();
    await expect(
      db.transaction(async () => {
        await db.transaction(async () => undefined);
      }),
    ).rejects.toThrow(/Nested transactions/);
  });

  it('serializes concurrent transactions so they never interleave', async () => {
    const db = freshDb();
    await db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, v TEXT)');
    const events: string[] = [];
    const run = (label: string) =>
      db.transaction(async (tx) => {
        events.push(`${label}:start`);
        await tx.run('INSERT INTO t (id, v) VALUES (?, ?)', [label, '1']);
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push(`${label}:end`);
      });

    await Promise.all([run('a'), run('b'), run('c')]);

    expect(events).toEqual([
      'a:start',
      'a:end',
      'b:start',
      'b:end',
      'c:start',
      'c:end',
    ]);
  });
});

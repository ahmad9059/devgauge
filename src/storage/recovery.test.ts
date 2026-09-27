import { describe, expect, it } from 'vitest';

import { isUnrecoverableKeyError } from '@/storage/recovery';

describe('key-loss recovery detection', () => {
  it('recognizes the SQLCipher wrong-key failure', () => {
    expect(
      isUnrecoverableKeyError(
        new Error('NativeDatabase.prepareAsync: file is not a database'),
      ),
    ).toBe(true);
    expect(isUnrecoverableKeyError('file is not a database')).toBe(true);
  });

  it('does not treat unrelated errors as key loss', () => {
    expect(isUnrecoverableKeyError(new Error('disk I/O error'))).toBe(false);
    expect(isUnrecoverableKeyError(new Error('UNIQUE constraint failed'))).toBe(
      false,
    );
  });
});

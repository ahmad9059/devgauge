import { describe, expect, it } from 'vitest';

import { getBuildEnvironment } from './environment';

describe('build environment', () => {
  it('defaults to a non-production package', () => {
    expect(getBuildEnvironment({})).toBe('development');
  });

  it('allows only declared build profiles', () => {
    expect(getBuildEnvironment({ APP_VARIANT: 'preview' })).toBe('preview');
    expect(getBuildEnvironment({ APP_VARIANT: 'production' })).toBe(
      'production',
    );
    expect(() => getBuildEnvironment({ APP_VARIANT: 'test' })).toThrow(
      'Unknown APP_VARIANT',
    );
  });
});

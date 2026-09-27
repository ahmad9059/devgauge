import { describe, expect, it } from 'vitest';

import { createSafeLogger } from '@/services/network/logger';

describe('safe logger', () => {
  it('never writes seeded secrets or credential headers', () => {
    const lines: string[] = [];
    const logger = createSafeLogger((line) => lines.push(line));

    logger.error('refresh failed', {
      connectionId: 'c1',
      status: 401,
      token: 'seeded-secret-value',
      headers: { Authorization: 'Bearer seeded-secret-value' },
      detail: 'used sk-seededsecretvalue123',
    });

    const output = lines.join('\n');
    expect(output).not.toContain('seeded-secret-value');
    expect(output).not.toContain('sk-seededsecretvalue123');
    expect(output).toContain('[redacted]');
    expect(output).toContain('"status":401');
  });
});

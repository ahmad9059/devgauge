import { describe, expect, it } from 'vitest';

import {
  redactHeaders,
  redactString,
  redactValue,
} from '@/services/network/redaction';

describe('redaction', () => {
  it('masks sensitive keys and scrubs credential-shaped strings', () => {
    expect(redactValue('accessToken', 'abc')).toBe('[redacted]');
    expect(redactValue('Authorization', 'Bearer abc.def-123')).toBe(
      '[redacted]',
    );
    expect(redactValue('errorCode', 'rate_limited')).toBe('rate_limited');
    expect(redactString('Authorization: Bearer abc.def-123')).toBe(
      'Authorization: [redacted]',
    );
    expect(redactString('key sk-abcdefghijklmnop')).toBe('key [redacted]');
    expect(redactString('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345')).toBe(
      '[redacted]',
    );
    expect(redactString('contact me@example.com')).toBe(
      'contact [redacted-email]',
    );
  });

  it('redacts nested headers without leaking values', () => {
    const headers = redactHeaders({
      Authorization: 'Bearer secret-token-value',
      'Content-Type': 'application/json',
    });
    expect(headers.Authorization).toBe('[redacted]');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

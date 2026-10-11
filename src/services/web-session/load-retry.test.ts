import { describe, expect, it } from 'vitest';

import {
  describeLoadError,
  isRetryableLoadError,
  loadRetryDelayMs,
  MAX_LOAD_RETRIES,
} from './load-retry';

describe('sign-in page load retry', () => {
  it('backs off exponentially and caps the delay', () => {
    expect(loadRetryDelayMs(1)).toBe(1_500);
    expect(loadRetryDelayMs(2)).toBe(3_000);
    expect(loadRetryDelayMs(3)).toBe(6_000);
    expect(loadRetryDelayMs(10)).toBe(6_000);
    expect(loadRetryDelayMs(0)).toBe(1_500);
    expect(MAX_LOAD_RETRIES).toBe(3);
  });

  it('retries transient network errors but not certificate errors', () => {
    expect(isRetryableLoadError('net::ERR_CONNECTION_RESET')).toBe(true);
    expect(isRetryableLoadError('net::ERR_TIMED_OUT')).toBe(true);
    expect(isRetryableLoadError('net::ERR_NAME_NOT_RESOLVED')).toBe(true);
    expect(isRetryableLoadError(undefined)).toBe(true);
    expect(isRetryableLoadError('net::ERR_CERT_AUTHORITY_INVALID')).toBe(false);
    expect(isRetryableLoadError('net::ERR_SSL_PROTOCOL_ERROR')).toBe(false);
  });

  it('explains a connection reset instead of showing a raw error code', () => {
    const message = describeLoadError(
      'chatgpt.com',
      'net::ERR_CONNECTION_RESET',
    );
    expect(message.title).toBe("Can't reach chatgpt.com");
    expect(message.description).toMatch(/VPN/);
    expect(message.description).toMatch(/Reload/);
    expect(JSON.stringify(message)).not.toMatch(/ERR_|-6/);
  });

  it('gives distinct guidance for offline, DNS, certificate and unknown failures', () => {
    expect(
      describeLoadError('chatgpt.com', 'net::ERR_INTERNET_DISCONNECTED').title,
    ).toBe('You appear to be offline');
    expect(
      describeLoadError('chatgpt.com', 'net::ERR_NAME_NOT_RESOLVED').title,
    ).toBe("Can't find chatgpt.com");
    expect(
      describeLoadError('chatgpt.com', 'net::ERR_CERT_DATE_INVALID').title,
    ).toBe('Secure connection failed');
    expect(describeLoadError('chatgpt.com', undefined).title).toBe(
      "Can't load chatgpt.com",
    );
  });
});

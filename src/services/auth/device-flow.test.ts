import { describe, expect, it } from 'vitest';

import {
  classifyDeviceTokenResponse,
  nextPollIntervalMs,
  parseDeviceAuthorization,
} from '@/services/auth/device-flow';

describe('device flow', () => {
  it('parses a device authorization response', () => {
    const parsed = parseDeviceAuthorization({
      device_code: 'dev',
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5,
    });
    expect(parsed).toEqual({
      deviceCode: 'dev',
      userCode: 'ABCD-1234',
      verificationUri: 'https://github.com/login/device',
      expiresInSeconds: 900,
      intervalSeconds: 5,
    });
    expect(() => parseDeviceAuthorization({})).toThrow();
  });

  it('defaults the poll interval when absent', () => {
    const parsed = parseDeviceAuthorization({
      device_code: 'dev',
      user_code: 'ABCD',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
    });
    expect(parsed.intervalSeconds).toBe(5);
  });

  it('classifies progress and terminal poll responses', () => {
    expect(
      classifyDeviceTokenResponse(200, {
        access_token: 'tok',
        expires_in: 28800,
      }),
    ).toMatchObject({ outcome: 'authorized', accessToken: 'tok' });
    expect(
      classifyDeviceTokenResponse(400, { error: 'authorization_pending' }),
    ).toMatchObject({ outcome: 'pending' });
    expect(
      classifyDeviceTokenResponse(400, { error: 'slow_down' }),
    ).toMatchObject({ outcome: 'slow-down' });
    expect(
      classifyDeviceTokenResponse(400, { error: 'expired_token' }),
    ).toMatchObject({ outcome: 'expired' });
    expect(
      classifyDeviceTokenResponse(400, { error: 'access_denied' }),
    ).toMatchObject({ outcome: 'denied' });
    expect(
      classifyDeviceTokenResponse(400, { error: 'nonsense' }),
    ).toMatchObject({
      outcome: 'error',
    });
    expect(classifyDeviceTokenResponse(200, { nope: true })).toMatchObject({
      outcome: 'error',
      errorCode: 'invalid_token_response',
    });
  });

  it('doubles the interval only on slow-down', () => {
    expect(nextPollIntervalMs(5000, { outcome: 'slow-down' })).toBe(10000);
    expect(nextPollIntervalMs(5000, { outcome: 'pending' })).toBe(5000);
  });
});

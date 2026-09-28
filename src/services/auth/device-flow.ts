import { z } from 'zod';

const deviceAuthorizationSchema = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.string().min(1),
  expires_in: z.number().int().positive(),
  interval: z.number().int().positive().optional(),
});

export type DeviceAuthorization = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresInSeconds: number;
  intervalSeconds: number;
};

export type DevicePollOutcome =
  'authorized' | 'pending' | 'slow-down' | 'expired' | 'denied' | 'error';

export type DevicePollResult = {
  outcome: DevicePollOutcome;
  accessToken?: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  errorCode?: string;
};

export function parseDeviceAuthorization(raw: unknown): DeviceAuthorization {
  const parsed = deviceAuthorizationSchema.parse(raw);
  return {
    deviceCode: parsed.device_code,
    userCode: parsed.user_code,
    verificationUri: parsed.verification_uri,
    expiresInSeconds: parsed.expires_in,
    intervalSeconds: parsed.interval ?? 5,
  };
}

const tokenSuccessSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive().optional(),
});

const deviceErrorSchema = z.object({ error: z.string().min(1) });

/**
 * Classifies a device-flow token poll response. GitHub signals progress with
 * 400 + `authorization_pending`/`slow_down` and terminal states with
 * `expired_token`/`access_denied`.
 */
export function classifyDeviceTokenResponse(
  status: number,
  body: unknown,
): DevicePollResult {
  if (status === 200) {
    const parsed = tokenSuccessSchema.safeParse(body);
    if (!parsed.success) {
      return { outcome: 'error', errorCode: 'invalid_token_response' };
    }
    return {
      outcome: 'authorized',
      accessToken: parsed.data.access_token,
      ...(parsed.data.refresh_token
        ? { refreshToken: parsed.data.refresh_token }
        : {}),
      ...(parsed.data.expires_in
        ? { expiresInSeconds: parsed.data.expires_in }
        : {}),
    };
  }

  const parsed = deviceErrorSchema.safeParse(body);
  const error = parsed.success ? parsed.data.error : 'unknown_error';
  switch (error) {
    case 'authorization_pending':
      return { outcome: 'pending', errorCode: error };
    case 'slow_down':
      return { outcome: 'slow-down', errorCode: error };
    case 'expired_token':
      return { outcome: 'expired', errorCode: error };
    case 'access_denied':
      return { outcome: 'denied', errorCode: error };
    default:
      return { outcome: 'error', errorCode: error };
  }
}

/** Applies GitHub's `slow_down` backoff to the current poll interval. */
export function nextPollIntervalMs(
  currentMs: number,
  result: DevicePollResult,
): number {
  if (result.outcome === 'slow-down') return currentMs * 2;
  return currentMs;
}

export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'; // host allowlisted separately

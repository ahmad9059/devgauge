import { isProviderId } from '@/domain/providers';

/** Native payloads cannot supply arbitrary links or router paths. */
export function notificationProviderRoute(
  data: unknown,
): `/provider/${string}` | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const payload = data as { devgauge?: unknown; providerId?: unknown };
  return payload.devgauge === true && isProviderId(payload.providerId)
    ? `/provider/${payload.providerId}`
    : null;
}

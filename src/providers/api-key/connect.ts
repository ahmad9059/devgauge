import type { ProviderId } from '@/domain/providers';
import { ProviderError } from '@/domain/errors';
import type { UsageWindow } from '@/domain/usage';
import type { HttpClient } from '@/services/network/client';
import { NetworkError } from '@/services/network/client';
import {
  extractRawWindows,
  mergeRawWindows,
  toDomainWindows,
  type CapturedResponse,
} from '@/services/web-session/usage-extract';
import { parseUsageText } from '@/services/web-session/usage-text';
import { API_KEY_CANDIDATES } from '@/providers/api-key/candidates';

export type ApiKeyProbeResult =
  { ok: true; windows: UsageWindow[] } | { ok: false; reason: string };

/**
 * Calls a candidate vendor usage endpoint with the user's key and extracts
 * whatever usage it can. It never fabricates values: an unrecognized response
 * returns ok:false with the HTTP status.
 */
export async function probeApiKey(
  client: HttpClient,
  providerId: ProviderId,
  apiKey: string,
  signal: AbortSignal,
): Promise<ApiKeyProbeResult> {
  const candidate = API_KEY_CANDIDATES[providerId];
  if (!candidate) return { ok: false, reason: 'No endpoint configured.' };

  let response;
  try {
    response = await client.get({
      url: candidate.url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'devgauge/0.1.0',
      },
      allowHosts: [candidate.host],
      signal,
    });
  } catch (error) {
    if (error instanceof NetworkError) {
      return { ok: false, reason: error.safeDetail };
    }
    return { ok: false, reason: 'Request failed.' };
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: 'Key rejected by the vendor.' };
  }
  if (response.status === 404) {
    return {
      ok: false,
      reason: 'Usage endpoint not available for this account.',
    };
  }
  if (response.status < 200 || response.status >= 300) {
    return { ok: false, reason: `Vendor returned HTTP ${response.status}.` };
  }

  const captured: CapturedResponse[] = [
    { url: candidate.url, body: response.body },
  ];
  const raw = mergeRawWindows([
    ...extractRawWindows(captured, candidate.keyMap),
    ...parseUsageText(response.body, candidate.keyMap),
  ]);
  const windows = toDomainWindows(raw, candidate.keyMap);
  if (windows.length === 0) {
    return { ok: false, reason: 'Connected, but no usage was recognized yet.' };
  }
  return { ok: true, windows };
}

export { ProviderError };

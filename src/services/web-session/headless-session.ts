import { requireNativeModule } from 'expo';
import { ProviderError } from '@/domain/errors';
import { createSyncBridgeScript } from './bridge-script';
import {
  SESSION_PROVIDERS,
  SESSION_USER_AGENT,
  type SessionProviderId,
} from './session-config';
import {
  extractRawWindows,
  toDomainWindows,
  type CapturedResponse,
} from './usage-extract';
import { parseUsageText } from './usage-text';
import { isQuotaReady } from './quota-readiness';

/** Validate native messages exactly as first-party foreground capture does. */
export function parseHeadlessCapture(
  providerId: SessionProviderId,
  messages: string[],
  capturedAt: Date,
) {
  const config = SESSION_PROVIDERS[providerId];
  const origin = new URL(config.usageUrl).origin;
  const responses = new Map<string, CapturedResponse>();
  let text = '';
  for (const message of messages) {
    if (message.length > 260000) continue;
    try {
      const data = JSON.parse(message);
      if (data.runId !== 1) continue;
      if (
        data.type === 'text' &&
        typeof data.text === 'string' &&
        data.text.length <= 60000
      )
        text = data.text;
      if (
        data.type === 'usage' &&
        typeof data.url === 'string' &&
        typeof data.body === 'string' &&
        data.body.length <= 200000
      ) {
        const url = new URL(data.url);
        if (
          url.origin === origin &&
          /(?:usage|quota|rate[_-]?limits|copilot_internal)/i.test(url.pathname)
        )
          responses.set(data.url, { url: data.url, body: data.body });
      }
    } catch {
      /* Ignore malformed provider messages. */
    }
  }
  const raw = new Map(
    extractRawWindows([...responses.values()], config.keyMap).map((window) => [
      window.key,
      window,
    ]),
  );
  for (const window of parseUsageText(text, config.keyMap)) {
    for (const [key, api] of raw) {
      if (
        key === window.key ||
        (providerId === 'codex' &&
          config.keyMap[key].kind === config.keyMap[window.key].kind)
      ) {
        if (api.usedPercent === window.usedPercent)
          window.resetsAt ??= api.resetsAt;
        raw.delete(key);
      }
    }
    raw.set(window.key, window);
  }
  return toDomainWindows([...raw.values()], config.keyMap, capturedAt);
}

export async function fetchHeadlessSession(
  providerId: SessionProviderId,
  signal: AbortSignal,
) {
  const native = requireNativeModule<{
    capture(
      id: string,
      url: string,
      hosts: string[],
      script: string,
      userAgent: string,
    ): Promise<string[]>;
    cancel(id: string): Promise<void>;
  }>('DevGaugeSession');
  const id = `${providerId}-${Date.now()}-${Math.random()}`;
  const config = SESSION_PROVIDERS[providerId];
  const capturedAt = new Date();
  if (signal.aborted) throw new ProviderError('unknown', 'Cancelled');
  const abort = () => {
    void native.cancel(id).catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const messages = await native.capture(
      id,
      config.usageUrl,
      config.allowedHosts,
      createSyncBridgeScript(1),
      SESSION_USER_AGENT,
    );
    if (signal.aborted) throw new ProviderError('unknown', 'Cancelled');
    const windows = parseHeadlessCapture(providerId, messages, capturedAt);
    if (!isQuotaReady(providerId, windows))
      throw new ProviderError('timeout', 'Background quota capture incomplete');
    return {
      windows,
      fetchedAt: capturedAt.toISOString(),
      schemaVersion: 1,
      isPartial: windows.some((window) => !window.resetsAt),
    };
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

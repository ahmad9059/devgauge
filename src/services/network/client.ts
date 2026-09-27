import { redactString } from './redaction';

export type HttpRequest = {
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Exact hosts (or their subdomains) the request may target. */
  allowHosts: string[];
  timeoutMs?: number;
  maxBytes?: number;
};

export type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export interface HttpClient {
  get(request: HttpRequest): Promise<HttpResponse>;
}

export type NetworkErrorCode =
  | 'insecure-url'
  | 'blocked-host'
  | 'timeout'
  | 'aborted'
  | 'redirect'
  | 'response-too-large'
  | 'network';

export class NetworkError extends Error {
  readonly code: NetworkErrorCode;
  /** A redacted, safe detail for diagnostics. */
  readonly safeDetail: string;

  constructor(
    code: NetworkErrorCode,
    detail: string,
    options: { cause?: unknown } = {},
  ) {
    super(
      `network ${code}: ${detail}`,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'NetworkError';
    this.code = code;
    this.safeDetail = redactString(detail);
  }
}

export type FetchResponseLike = {
  status: number;
  headers: {
    get(name: string): string | null;
    forEach(callback: (value: string, key: string) => void): void;
  };
  text(): Promise<string>;
};

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers?: Record<string, string>;
    signal: AbortSignal;
    redirect: 'manual';
  },
) => Promise<FetchResponseLike>;

export const DEFAULT_TIMEOUT_MS = 20_000;
export const DEFAULT_MAX_BYTES = 256 * 1024;

function headerRecord(response: FetchResponseLike): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

export function isHostAllowed(url: URL, allowHosts: string[]): boolean {
  const host = url.hostname.toLowerCase();
  return allowHosts.some((allowed) => {
    const target = allowed.toLowerCase();
    return host === target || host.endsWith(`.${target}`);
  });
}

export function createHttpClient(
  options: {
    fetchImpl?: FetchLike;
    timeoutMs?: number;
    maxBytes?: number;
  } = {},
): HttpClient {
  const fetchImpl =
    options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  return {
    async get(request: HttpRequest): Promise<HttpResponse> {
      let url: URL;
      try {
        url = new URL(request.url);
      } catch {
        throw new NetworkError('blocked-host', 'invalid url');
      }
      if (url.protocol !== 'https:') {
        throw new NetworkError('insecure-url', 'non-https request refused');
      }
      if (url.username || url.password || url.port) {
        throw new NetworkError('blocked-host', 'url credentials/port refused');
      }
      if (!isHostAllowed(url, request.allowHosts)) {
        throw new NetworkError(
          'blocked-host',
          `host not allowlisted: ${url.hostname}`,
        );
      }

      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, request.timeoutMs ?? timeoutMs);
      const onExternalAbort = () => controller.abort();
      if (request.signal) {
        if (request.signal.aborted) {
          clearTimeout(timeout);
          throw new NetworkError('aborted', 'request already aborted');
        }
        request.signal.addEventListener('abort', onExternalAbort, {
          once: true,
        });
      }

      let response: FetchResponseLike;
      try {
        response = await fetchImpl(url.toString(), {
          method: 'GET',
          headers: request.headers,
          signal: controller.signal,
          redirect: 'manual',
        });
      } catch (error) {
        if (timedOut)
          throw new NetworkError('timeout', 'request timed out', {
            cause: error,
          });
        if (request.signal?.aborted) {
          throw new NetworkError('aborted', 'request aborted', {
            cause: error,
          });
        }
        throw new NetworkError('network', 'request failed', { cause: error });
      } finally {
        clearTimeout(timeout);
        request.signal?.removeEventListener('abort', onExternalAbort);
      }

      if (response.status >= 300 && response.status < 400) {
        throw new NetworkError('redirect', 'redirects are not followed');
      }

      const headers = headerRecord(response);
      const declared = headers['content-length'];
      if (
        declared !== undefined &&
        Number(declared) > (request.maxBytes ?? maxBytes)
      ) {
        throw new NetworkError(
          'response-too-large',
          'declared content-length exceeds cap',
        );
      }
      const body = await response.text();
      if (body.length > (request.maxBytes ?? maxBytes)) {
        throw new NetworkError(
          'response-too-large',
          'response body exceeds cap',
        );
      }

      return { status: response.status, headers, body };
    },
  };
}

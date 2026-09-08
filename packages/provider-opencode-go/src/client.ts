import { ProviderError } from "@devgauge/provider-core";

import { classifyResponseError, malformedSuccess } from "./errors.js";
import { normalizeOpenCodeWindow, type ProviderUsageWithDiagnostics } from "./normalize.js";
import { openCodeGoUsageSchema, type OpenCodeGoUsage } from "./schema.js";

export const OPENCODE_GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MiB
const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface OpenCodeGoClientOptions {
  apiKey: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Injected clock for deterministic tests. */
  now?: () => Date;
}

/**
 * Fetches and validates normalized OpenCode Go usage.
 *
 * Security posture: allowlisted single host, no redirects (a redirect throws),
 * bounded response size, bounded timeout, and the API key is never included in
 * returned values or diagnostics.
 */
export const fetchOpenCodeGoUsage = async (
  options: OpenCodeGoClientOptions
): Promise<ProviderUsageWithDiagnostics> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? (() => new Date());

  let response: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetchImpl(OPENCODE_GO_USAGE_URL, {
        method: "GET",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          accept: "application/json",
        },
        redirect: "error",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw ProviderError.transientUpstream("OpenCode Go usage request timed out");
    }
    throw ProviderError.transientUpstream("OpenCode Go usage endpoint unreachable");
  }

  const raw = await readBoundedText(response);
  if (!response.ok) {
    throw classifyResponseError(raw, response.status);
  }

  const parsed: unknown = parseJson(raw);
  if (parsed === undefined) {
    throw malformedSuccess("non-JSON 2xx body");
  }

  const result = openCodeGoUsageSchema.safeParse(parsed);
  if (!result.success) {
    throw malformedSuccess("schema mismatch");
  }
  return toProviderUsage(result.data, now());
};

const readBoundedText = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw malformedSuccess("response too large");
  }
  return text;
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const toProviderUsage = (data: OpenCodeGoUsage, fetchedAt: Date): ProviderUsageWithDiagnostics => {
  const windows: ProviderUsageWithDiagnostics["windows"] = [];
  const diagnostics: ProviderUsageWithDiagnostics["diagnostics"] = {};

  for (const id of ["rolling", "weekly", "monthly"] as const) {
    const normalized = normalizeOpenCodeWindow(id, data.usage[id]);
    if (!normalized) continue;
    windows.push(normalized.window);
    diagnostics[id] = { upstreamPercent: normalized.upstreamPercent };
  }

  return {
    provider: "opencode-go",
    plan: "go",
    windows,
    fetchedAt: fetchedAt.toISOString(),
    source: "source-backed",
    stale: false,
    diagnostics,
  };
};
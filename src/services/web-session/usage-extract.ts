import {
  deriveWindow,
  type UsageWindow,
  type UsageWindowKind,
} from '@/domain/usage';

export type CapturedResponse = { url: string; body: string };

export type WindowKeyMap = Record<
  string,
  { label: string; kind: UsageWindowKind }
>;

export type ExtractedUsage = {
  windows: UsageWindow[];
  matchedUrls: string[];
};

type RawWindow = {
  key: string;
  value: number;
  resetsAt: string | null;
};

function pickNumber(
  node: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickString(
  node: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

const UTILIZATION_KEYS = [
  'utilization',
  'used_percent',
  'used_percentage',
  'percent_used',
  'percent',
];
const RESET_KEYS = ['resets_at', 'reset_at', 'resetsAt', 'resetAt', 'resets'];

function walk(
  node: unknown,
  knownAncestor: string | null,
  keyMap: WindowKeyMap,
  out: RawWindow[],
): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, knownAncestor, keyMap, out);
    return;
  }
  const record = node as Record<string, unknown>;
  const value = pickNumber(record, UTILIZATION_KEYS);
  if (value !== null && knownAncestor !== null) {
    out.push({
      key: knownAncestor,
      value: value <= 1 ? value * 100 : value,
      resetsAt: pickString(record, RESET_KEYS),
    });
  }
  for (const [key, child] of Object.entries(record)) {
    if (child !== null && typeof child === 'object') {
      // Track the nearest recognized key so nested shapes like
      // { rate_limits: { primary: { used_percent } } } still map.
      walk(child, keyMap[key] ? key : knownAncestor, keyMap, out);
    }
  }
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * Extracts usage windows from responses the provider's own page fetched. It
 * never reads passwords or form input; it only reads response bodies the site
 * itself requested. Tolerant to payload changes: unknown keys fall back to a
 * generic label, unknown utilization is skipped.
 */
export function extractUsageWindows(
  responses: readonly CapturedResponse[],
  keyMap: WindowKeyMap,
): ExtractedUsage {
  const found = new Map<string, RawWindow>();
  const matchedUrls: string[] = [];

  for (const response of responses) {
    const parsed = parseBody(response.body);
    if (parsed === null) continue;
    const raw: RawWindow[] = [];
    walk(parsed, null, keyMap, raw);
    if (raw.length === 0) continue;
    matchedUrls.push(response.url);
    for (const window of raw) {
      if (!keyMap[window.key]) continue;
      const existing = found.get(window.key);
      if (!existing || window.value > existing.value)
        found.set(window.key, window);
    }
  }

  const windows: UsageWindow[] = [...found.values()].map((window) => {
    const mapping = keyMap[window.key];
    return deriveWindow({
      externalKey: `session.${window.key}`,
      kind: mapping.kind,
      label: mapping.label,
      used: window.value.toFixed(1),
      limit: '100',
      unit: 'percent',
      resetsAt: window.resetsAt,
      derivation: 'provider',
    });
  });

  return { windows, matchedUrls: [...new Set(matchedUrls)] };
}

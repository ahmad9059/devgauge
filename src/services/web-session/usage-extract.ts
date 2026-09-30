import {
  deriveWindow,
  type UsageWindow,
  type UsageWindowKind,
} from '@/domain/usage';

export type CapturedResponse = { url: string; body: string };

export type WindowKeyMapEntry = {
  label: string;
  kind: UsageWindowKind;
  /** True when the provider reports this window as remaining, not used. */
  remaining?: boolean;
};
export type WindowKeyMap = Record<string, WindowKeyMapEntry>;

export type ExtractedUsage = {
  windows: UsageWindow[];
  matchedUrls: string[];
};

type RawWindow = {
  key: string;
  usedPercent: number;
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
      const parsed = Number(value.replace(/[%,$]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickReset(
  node: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = node[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
    // Codex returns reset_at as a Unix timestamp in some page/API variants.
    if (typeof value === 'number' && Number.isFinite(value)) {
      const milliseconds = value < 100_000_000_000 ? value * 1000 : value;
      const date = new Date(milliseconds);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }
  return null;
}

// Providers differ: Claude reports utilization (used), Codex reports remaining.
const USED_KEYS = [
  'utilization',
  'used_percent',
  'used_percentage',
  'usedPercent',
  'percent_used',
];
const REMAINING_KEYS = [
  'remaining_percent',
  'percent_remaining',
  'remainingPercent',
  'remaining',
];
const RESET_KEYS = [
  'resets_at',
  'reset_at',
  'resetsAt',
  'resetAt',
  'resets_at_iso',
];

function toPercent(value: number): number {
  return value <= 1 ? value * 100 : value;
}

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
  if (knownAncestor !== null) {
    const used = pickNumber(record, USED_KEYS);
    const remaining = pickNumber(record, REMAINING_KEYS);
    if (used !== null) {
      const percent = toPercent(used);
      out.push({
        key: knownAncestor,
        usedPercent: keyMap[knownAncestor]?.remaining
          ? Math.max(0, 100 - percent)
          : percent,
        resetsAt: pickReset(record, RESET_KEYS),
      });
    } else if (remaining !== null) {
      out.push({
        key: knownAncestor,
        usedPercent: Math.max(0, 100 - toPercent(remaining)),
        resetsAt: pickReset(record, RESET_KEYS),
      });
    }
  }
  for (const [key, child] of Object.entries(record)) {
    if (child !== null && typeof child === 'object') {
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

/** Highest used-percent value per key across all captured responses. */
export function mergeRawWindows(raw: readonly RawWindow[]): RawWindow[] {
  const found = new Map<string, RawWindow>();
  for (const window of raw) {
    const existing = found.get(window.key);
    if (!existing || window.usedPercent > existing.usedPercent) {
      found.set(window.key, window);
    }
  }
  return [...found.values()];
}

export function toDomainWindows(
  raw: readonly RawWindow[],
  keyMap: WindowKeyMap,
): UsageWindow[] {
  return raw
    .filter((window) => keyMap[window.key])
    .map((window) =>
      deriveWindow({
        externalKey: `session.${window.key}`,
        kind: keyMap[window.key].kind,
        label: keyMap[window.key].label,
        used: window.usedPercent.toFixed(1),
        limit: '100',
        unit: 'percent',
        resetsAt: window.resetsAt,
        derivation: 'provider',
      }),
    );
}

export type { RawWindow };

export function extractUsageWindows(
  responses: readonly CapturedResponse[],
  keyMap: WindowKeyMap,
): ExtractedUsage {
  const raw = extractRawWindows(responses, keyMap);
  const matchedUrls: string[] = [];
  for (const response of responses) {
    const parsed = parseBody(response.body);
    if (parsed === null) continue;
    const probe: RawWindow[] = [];
    walk(parsed, null, keyMap, probe);
    if (probe.length > 0) matchedUrls.push(response.url);
  }
  return {
    windows: toDomainWindows(raw, keyMap),
    matchedUrls: [...new Set(matchedUrls)],
  };
}

/** Merged raw windows from JSON responses, before text parsing. */
export function extractRawWindows(
  responses: readonly CapturedResponse[],
  keyMap: WindowKeyMap,
): RawWindow[] {
  const raw: RawWindow[] = [];
  for (const response of responses) {
    const parsed = parseBody(response.body);
    if (parsed === null) continue;
    walk(parsed, null, keyMap, raw);
  }
  // `remaining` keys are already inverted inside `walk`.
  return mergeRawWindows(raw);
}

import { normalizeResetTime } from '@/domain/reset-time';
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
  /** Units for ambiguous JSON fields, explicitly declared by the transport. */
  utilizationUnit?: 'percent' | 'ratio';
  remainingUnit?: 'percent' | 'ratio';
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
      const numeric = value.trim().replace(/%$/, '').trim();
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric)) continue;
      const parsed = Number(numeric);
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
];
const RESET_KEYS = [
  'resets_at',
  'reset_at',
  'resetsAt',
  'resetAt',
  'resets_at_iso',
];

function toPercent(value: number, unit: 'percent' | 'ratio'): number {
  return unit === 'ratio' ? value * 100 : value;
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
    const metadata = keyMap[knownAncestor];
    const explicitUsed = pickNumber(
      record,
      USED_KEYS.filter((key) => key !== 'utilization'),
    );
    const ratioUsed = pickNumber(record, ['used_ratio', 'usedRatio']);
    const utilization = pickNumber(record, ['utilization']);
    const used =
      explicitUsed ??
      (ratioUsed === null ? null : ratioUsed * 100) ??
      (utilization === null
        ? null
        : toPercent(utilization, metadata.utilizationUnit ?? 'percent'));
    const explicitRemaining = pickNumber(record, REMAINING_KEYS);
    const ratioRemaining = pickNumber(record, [
      'remaining_ratio',
      'remainingRatio',
    ]);
    const ambiguousRemaining = metadata.remainingUnit
      ? pickNumber(record, ['remaining'])
      : null;
    const remaining =
      explicitRemaining ??
      (ratioRemaining === null ? null : ratioRemaining * 100) ??
      (ambiguousRemaining === null
        ? null
        : toPercent(ambiguousRemaining, metadata.remainingUnit!));
    if (used !== null && used >= 0) {
      const percent = used;
      out.push({
        key: knownAncestor,
        // Explicit API used-percent fields already measure consumption.
        // The remaining flag applies to unqualified visible page percentages.
        usedPercent: percent,
        resetsAt: pickReset(record, RESET_KEYS),
      });
    } else if (remaining !== null && remaining >= 0 && remaining <= 100) {
      out.push({
        key: knownAncestor,
        usedPercent: Math.max(0, 100 - remaining),
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
      found.set(window.key, { ...window });
    } else if (
      window.usedPercent === existing.usedPercent &&
      !existing.resetsAt
    ) {
      existing.resetsAt = window.resetsAt;
    }
  }
  return [...found.values()];
}

export function toDomainWindows(
  raw: readonly RawWindow[],
  keyMap: WindowKeyMap,
  capturedAt?: Date,
): UsageWindow[] {
  return raw
    .filter((window) => keyMap[window.key])
    .map((window) =>
      deriveWindow({
        externalKey: `session.${window.key}`,
        kind: keyMap[window.key].kind,
        label: keyMap[window.key].label,
        used: String(window.usedPercent),
        limit: '100',
        unit: 'percent',
        resetsAt: normalizeResetTime(window.resetsAt, capturedAt),
        resetsSourceText: window.resetsAt,
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

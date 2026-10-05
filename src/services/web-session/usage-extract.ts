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
  unit?: 'credits' | 'requests' | 'tokens';
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
  used?: number;
  limit?: number;
  unit?: 'credits' | 'requests' | 'tokens';
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
    if (typeof value === 'string' && value.trim() !== '' && value.length <= 200)
      return value.trim();
    // Codex returns reset_at as a Unix timestamp in some page/API variants.
    if (typeof value === 'number' && Number.isFinite(value)) {
      const instant = normalizeResetTime(value);
      if (instant) return instant;
    }
  }
  const seconds = pickNumber(node, [
    'reset_after_seconds',
    'resetAfterSeconds',
  ]);
  if (
    seconds !== null &&
    seconds >= 0 &&
    seconds < Number.MAX_SAFE_INTEGER / 1000
  )
    return `in ${seconds} seconds`;
  return null;
}

// Providers differ: Claude reports utilization (used), Codex reports remaining.
const USED_KEYS = [
  'utilization',
  'used_percent',
  'used_percentage',
  'usedPercent',
  'percent_used',
  'percentUsed',
];
const REMAINING_KEYS = [
  'remaining_percent',
  'percent_remaining',
  'remainingPercent',
  'remaining_percentage',
  'percent_left',
  'percentLeft',
];
const RESET_KEYS = [
  'resets_at',
  'reset_at',
  'resetsAt',
  'resetAt',
  'resets_at_iso',
  'resetTime',
  'reset_time',
  'reset_timestamp',
];

function toPercent(value: number, unit: 'percent' | 'ratio'): number {
  return unit === 'ratio' ? value * 100 : value;
}

function walk(
  node: unknown,
  knownAncestor: string | null,
  keyMap: WindowKeyMap,
  out: RawWindow[],
  depth = 0,
  budget = { remaining: 10000 },
): void {
  if (
    node === null ||
    typeof node !== 'object' ||
    depth > 32 ||
    budget.remaining-- <= 0
  )
    return;
  if (Array.isArray(node)) {
    for (const child of node)
      walk(child, knownAncestor, keyMap, out, depth + 1, budget);
    return;
  }
  const record = node as Record<string, unknown>;
  let foundDirect = false;
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
        : toPercent(
            utilization,
            typeof record.utilization === 'string' &&
              record.utilization.trim().endsWith('%')
              ? 'percent'
              : (metadata.utilizationUnit ?? 'percent'),
          ));
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
    const countLimit = metadata.unit
      ? pickNumber(record, ['limit', 'total', 'entitlement', 'quota'])
      : null;
    const countUsed = metadata.unit
      ? pickNumber(record, ['used', 'consumed'])
      : null;
    const countRemaining = metadata.unit
      ? pickNumber(record, ['remaining', 'left', 'available'])
      : null;
    const consumed =
      countUsed ??
      (countLimit !== null &&
      countRemaining !== null &&
      countRemaining >= 0 &&
      countRemaining <= countLimit
        ? countLimit - countRemaining
        : null);
    if (
      countLimit !== null &&
      countLimit > 0 &&
      consumed !== null &&
      consumed >= 0 &&
      Number.isFinite((consumed / countLimit) * 100)
    ) {
      out.push({
        key: knownAncestor,
        usedPercent: (consumed / countLimit) * 100,
        used: consumed,
        limit: countLimit,
        unit: metadata.unit,
        resetsAt: pickReset(record, RESET_KEYS),
      });
      foundDirect = true;
    } else if (used !== null && used >= 0 && Number.isFinite(used)) {
      const percent = used;
      out.push({
        key: knownAncestor,
        // Explicit API used-percent fields already measure consumption.
        // The remaining flag applies to unqualified visible page percentages.
        usedPercent: percent,
        resetsAt: pickReset(record, RESET_KEYS),
      });
      foundDirect = true;
    } else if (remaining !== null && remaining >= 0 && remaining <= 100) {
      out.push({
        key: knownAncestor,
        usedPercent: Math.max(0, 100 - remaining),
        resetsAt: pickReset(record, RESET_KEYS),
      });
      foundDirect = true;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    if (child !== null && typeof child === 'object') {
      walk(
        child,
        Object.hasOwn(keyMap, key) ? key : foundDirect ? null : knownAncestor,
        keyMap,
        out,
        depth + 1,
        budget,
      );
    }
  }
}

function parseBody(body: string): unknown {
  if (typeof body !== 'string' || body.length > 200000) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** Latest observation wins, including lower usage after a real quota reset. */
export function mergeRawWindows(raw: readonly RawWindow[]): RawWindow[] {
  const found = new Map<string, RawWindow>();
  for (const window of raw) {
    const existing = found.get(window.key);
    if (!Number.isFinite(window.usedPercent) || window.usedPercent < 0)
      continue;
    found.set(window.key, {
      ...window,
      resetsAt:
        window.resetsAt ??
        (existing?.usedPercent === window.usedPercent
          ? existing.resetsAt
          : null),
    });
  }
  return [...found.values()];
}

export function toDomainWindows(
  raw: readonly RawWindow[],
  keyMap: WindowKeyMap,
  capturedAt?: Date,
): UsageWindow[] {
  return raw
    .filter(
      (window) =>
        Object.hasOwn(keyMap, window.key) &&
        Number.isFinite(window.usedPercent) &&
        window.usedPercent >= 0 &&
        window.usedPercent <= Number.MAX_SAFE_INTEGER / 100 &&
        (!window.unit ||
          (['credits', 'requests', 'tokens'].includes(window.unit) &&
            Number.isFinite(window.used) &&
            window.used! >= 0 &&
            window.used! <= Number.MAX_SAFE_INTEGER &&
            Number.isFinite(window.limit) &&
            window.limit! > 0 &&
            window.limit! <= Number.MAX_SAFE_INTEGER)),
    )
    .map((window) =>
      deriveWindow({
        externalKey: `session.${window.key}`,
        kind: keyMap[window.key].kind,
        label: keyMap[window.key].label,
        used: numberDecimal(window.used ?? window.usedPercent),
        limit: numberDecimal(window.limit ?? 100),
        unit: window.unit ?? 'percent',
        resetsAt: normalizeResetTime(window.resetsAt, capturedAt),
        resetsSourceText: window.resetsAt,
        derivation: 'provider',
      }),
    );
}

/** Keep tiny finite percentages valid for the domain's base-10 decimal parser. */
function numberDecimal(value: number): string {
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [coefficient, exponent] = text.toLowerCase().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
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

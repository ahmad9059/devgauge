import { deriveWindow, type UsageWindow } from '@/domain/usage';

export const ANTIGRAVITY_QUOTA_ENDPOINT =
  'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota';
export const ANTIGRAVITY_LOAD_ENDPOINT =
  'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist';

type Bucket = { model: string; remaining: number; resetTime: string | null };

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

const REMAINING_KEYS = [
  'remainingFraction',
  'remaining_fraction',
  'remainingPercent',
  'remaining_percent',
];
const MODEL_KEYS = ['modelId', 'model_id', 'model', 'modelName', 'model_name'];
const RESET_KEYS = [
  'resetTime',
  'reset_time',
  'resetsAt',
  'resetAt',
  'resets_at',
];

function findBuckets(
  node: unknown,
  out: Bucket[],
  parentKey: string | null,
): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) findBuckets(child, out, parentKey);
    return;
  }
  const record = node as Record<string, unknown>;
  const remaining = pickNumber(record, REMAINING_KEYS);
  if (remaining !== null && remaining >= 0 && remaining <= 1) {
    const model = pickString(record, MODEL_KEYS) ?? parentKey ?? 'antigravity';
    out.push({
      model,
      remaining,
      resetTime: pickString(record, RESET_KEYS),
    });
  }
  for (const [key, child] of Object.entries(record)) {
    if (child !== null && typeof child === 'object')
      findBuckets(child, out, key);
  }
}

function humanize(model: string): string {
  return model
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Turns a Code Assist / Antigravity quota payload into usage windows. */
export function parseQuotaPayload(json: unknown): UsageWindow[] {
  const buckets: Bucket[] = [];
  findBuckets(json, buckets, null);

  const byModel = new Map<string, Bucket>();
  for (const bucket of buckets) {
    const existing = byModel.get(bucket.model);
    if (!existing || bucket.remaining < existing.remaining) {
      byModel.set(bucket.model, bucket);
    }
  }

  return [...byModel.values()].map((bucket) =>
    deriveWindow({
      externalKey: `antigravity.${bucket.model}`,
      kind: 'rolling',
      label: humanize(bucket.model),
      used: ((1 - bucket.remaining) * 100).toFixed(1),
      limit: '100',
      unit: 'percent',
      resetsAt: bucket.resetTime,
      derivation: 'provider',
    }),
  );
}

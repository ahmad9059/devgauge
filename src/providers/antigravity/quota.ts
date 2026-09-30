import { deriveWindow, type UsageWindow } from '@/domain/usage';

export const ANTIGRAVITY_LOAD_ENDPOINT =
  'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist';
export const ANTIGRAVITY_MODELS_ENDPOINT =
  'https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels';
export const ANTIGRAVITY_QUOTA_ENDPOINT =
  'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota';

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
// Keys that only group a quota (e.g. `{ models: { id: { quotaInfo: {...} } } }`);
// the nearest non-wrapper ancestor is the model identifier.
const WRAPPER_KEYS = new Set([
  'quotaInfo',
  'quota_info',
  'quota',
  'buckets',
  'bucket',
  'limits',
  'rateLimits',
  'rate_limits',
  'modelQuotas',
  'model_quotas',
]);

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
    if (child !== null && typeof child === 'object') {
      const nextParent = WRAPPER_KEYS.has(key) ? parentKey : key;
      findBuckets(child, out, nextParent);
    }
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

export function buildLoadCodeAssistBody(): string {
  return JSON.stringify({
    metadata: {
      ideType: 'ANTIGRAVITY',
      platform: 'PLATFORM_UNSPECIFIED',
      pluginType: 'GEMINI',
    },
  });
}

export function buildFetchModelsBody(projectId: string | null): string {
  return JSON.stringify(projectId ? { project: projectId } : {});
}

/** Reads the Cloud Code project id from a loadCodeAssist payload. */
export function extractProjectId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const value = (json as Record<string, unknown>).cloudaicompanionProject;
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value && typeof value === 'object') {
    const id = (value as Record<string, unknown>).id;
    if (typeof id === 'string' && id.trim() !== '') return id;
  }
  return null;
}

/** Reads the plan/tier label from a loadCodeAssist payload, when present. */
export function extractPlan(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const record = json as Record<string, unknown>;
  const tier = record.currentTier;
  if (tier && typeof tier === 'object') {
    const name = pickString(tier as Record<string, unknown>, ['name', 'id']);
    if (name) return name;
  }
  const planInfo = record.planInfo;
  if (planInfo && typeof planInfo === 'object') {
    const plan = pickString(planInfo as Record<string, unknown>, [
      'planType',
      'plan_type',
    ]);
    if (plan) return plan;
  }
  return typeof record.planType === 'string' ? record.planType : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export type AntigravityFetch = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export type AntigravityQuota = {
  windows: UsageWindow[];
  projectId: string | null;
  plan: string | null;
  detail: string;
};

/**
 * Loads the signed-in account's Cloud Code Assist quota. `loadCodeAssist`
 * resolves the project and plan; `fetchAvailableModels` returns per-model
 * remaining fractions. `retrieveUserQuota` is tried as a fallback.
 */
export async function loadAntigravityQuota(
  accessToken: string,
  fetchImpl: AntigravityFetch,
): Promise<AntigravityQuota> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const loadResponse = await fetchImpl(ANTIGRAVITY_LOAD_ENDPOINT, {
    method: 'POST',
    headers,
    body: buildLoadCodeAssistBody(),
  });
  const loadText = await loadResponse.text();
  const loadJson = safeJson(loadText);
  const projectId = extractProjectId(loadJson);
  const plan = extractPlan(loadJson);

  const modelsResponse = await fetchImpl(ANTIGRAVITY_MODELS_ENDPOINT, {
    method: 'POST',
    headers,
    body: buildFetchModelsBody(projectId),
  });
  const modelsText = await modelsResponse.text();
  const modelsJson = safeJson(modelsText);
  let windows = modelsJson ? parseQuotaPayload(modelsJson) : [];
  let detail = `models HTTP ${modelsResponse.status}`;

  if (windows.length === 0) {
    const quotaResponse = await fetchImpl(ANTIGRAVITY_QUOTA_ENDPOINT, {
      method: 'POST',
      headers,
      body: buildFetchModelsBody(projectId),
    });
    const quotaText = await quotaResponse.text();
    const quotaJson = safeJson(quotaText);
    windows = quotaJson ? parseQuotaPayload(quotaJson) : [];
    detail = `models HTTP ${modelsResponse.status}, quota HTTP ${quotaResponse.status}`;
  }

  return { windows, projectId, plan, detail };
}

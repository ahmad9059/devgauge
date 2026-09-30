import { deriveWindow, type UsageWindow } from '@/domain/usage';

export const ANTIGRAVITY_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
export const ANTIGRAVITY_API_VERSION = 'v1internal';
export const ANTIGRAVITY_LOAD_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:loadCodeAssist`;
export const ANTIGRAVITY_ONBOARD_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:onboardUser`;
export const ANTIGRAVITY_MODELS_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:fetchAvailableModels`;
export const ANTIGRAVITY_QUOTA_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:retrieveUserQuota`;

// The Code Assist API rejects requests that do not identify as a known client.
export const ANTIGRAVITY_REQUEST_HEADERS = {
  'User-Agent': 'antigravity',
  'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
};

const CLIENT_METADATA = {
  ideType: 'ANTIGRAVITY',
  platform: 'PLATFORM_UNSPECIFIED',
  pluginType: 'GEMINI',
};

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

export function buildLoadCodeAssistBody(projectId: string | null): string {
  return JSON.stringify({
    ...(projectId ? { cloudaicompanionProject: projectId } : {}),
    metadata: {
      ...CLIENT_METADATA,
      ...(projectId ? { duetProject: projectId } : {}),
    },
  });
}

export function buildOnboardUserBody(
  tierId: string,
  projectId: string | null,
): string {
  return JSON.stringify({
    tierId,
    ...(projectId ? { cloudaicompanionProject: projectId } : {}),
    metadata: {
      ...CLIENT_METADATA,
      ...(projectId ? { duetProject: projectId } : {}),
    },
  });
}

export function buildProjectBody(projectId: string | null): string {
  return JSON.stringify(projectId ? { project: projectId } : {});
}

/** Reads the Cloud Code project id from a loadCodeAssist / operation payload. */
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

/** The id of the default onboarding tier, used when the account has no project. */
export function extractDefaultTierId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const tiers = (json as Record<string, unknown>).allowedTiers;
  if (!Array.isArray(tiers)) return null;
  for (const tier of tiers) {
    if (!tier || typeof tier !== 'object') continue;
    const record = tier as Record<string, unknown>;
    if (record.isDefault === true && typeof record.id === 'string') {
      return record.id;
    }
  }
  return null;
}

/** A human-readable reason when the account is not eligible for any tier. */
export function extractIneligibleReason(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const tiers = (json as Record<string, unknown>).ineligibleTiers;
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  const reasons = tiers
    .map((tier) =>
      tier && typeof tier === 'object'
        ? pickString(tier as Record<string, unknown>, [
            'reasonMessage',
            'reason_message',
            'reasonCode',
          ])
        : null,
    )
    .filter((reason): reason is string => reason !== null);
  return reasons.length > 0 ? reasons.join('; ') : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function snippet(text: string): string {
  return text.replace(/\s+/g, ' ').slice(0, 140);
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

export type AntigravityOptions = { sleep?: (ms: number) => Promise<void> };

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function operationUrl(name: string): string {
  return `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}/${name}`;
}

/**
 * Loads the signed-in account's Cloud Code Assist quota, mirroring the official
 * client flow: `loadCodeAssist` resolves the project/plan (onboarding via
 * `onboardUser` when the account has no managed project yet), then
 * `fetchAvailableModels` returns per-model remaining fractions, with
 * `retrieveUserQuota` as a fallback.
 */
export async function loadAntigravityQuota(
  accessToken: string,
  fetchImpl: AntigravityFetch,
  options: AntigravityOptions = {},
): Promise<AntigravityQuota> {
  const sleep = options.sleep ?? defaultSleep;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...ANTIGRAVITY_REQUEST_HEADERS,
  };

  const loadResponse = await fetchImpl(ANTIGRAVITY_LOAD_ENDPOINT, {
    method: 'POST',
    headers,
    body: buildLoadCodeAssistBody(null),
  });
  const loadText = await loadResponse.text();
  const loadJson = safeJson(loadText);
  let projectId = extractProjectId(loadJson);
  const plan = extractPlan(loadJson);
  let detail = `loadCodeAssist HTTP ${loadResponse.status}`;

  if (!projectId) {
    const tierId = extractDefaultTierId(loadJson);
    if (!tierId) {
      const reason = extractIneligibleReason(loadJson);
      return {
        windows: [],
        projectId: null,
        plan,
        detail: reason ?? `${detail}: ${snippet(loadText)}`,
      };
    }

    const onboardResponse = await fetchImpl(ANTIGRAVITY_ONBOARD_ENDPOINT, {
      method: 'POST',
      headers,
      body: buildOnboardUserBody(tierId, null),
    });
    let operation = safeJson(await onboardResponse.text());
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const record =
        operation && typeof operation === 'object'
          ? (operation as Record<string, unknown>)
          : null;
      const response = record?.response;
      projectId =
        extractProjectId(response) ??
        (record && record.done ? null : extractProjectId(record));
      if (projectId) break;
      const name =
        record && typeof record.name === 'string' ? record.name : null;
      if (!name || record?.done === true) break;
      await sleep(1500);
      const operationResponse = await fetchImpl(operationUrl(name), {
        method: 'GET',
        headers,
      });
      operation = safeJson(await operationResponse.text());
    }
    detail = `onboard HTTP ${onboardResponse.status}`;
    if (!projectId) {
      return { windows: [], projectId: null, plan, detail };
    }
  }

  const modelsResponse = await fetchImpl(ANTIGRAVITY_MODELS_ENDPOINT, {
    method: 'POST',
    headers,
    body: buildProjectBody(projectId),
  });
  const modelsText = await modelsResponse.text();
  const modelsJson = safeJson(modelsText);
  let windows = modelsJson ? parseQuotaPayload(modelsJson) : [];

  if (windows.length === 0) {
    const quotaResponse = await fetchImpl(ANTIGRAVITY_QUOTA_ENDPOINT, {
      method: 'POST',
      headers,
      body: buildProjectBody(projectId),
    });
    const quotaText = await quotaResponse.text();
    const quotaJson = safeJson(quotaText);
    windows = quotaJson ? parseQuotaPayload(quotaJson) : [];
    detail =
      `models HTTP ${modelsResponse.status}: ${snippet(modelsText)} · ` +
      `quota HTTP ${quotaResponse.status}: ${snippet(quotaText)}`;
  } else {
    detail = `models HTTP ${modelsResponse.status}`;
  }

  return { windows, projectId, plan, detail };
}

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

/** Antigravity shared pools. Models in each pool share its hourly/weekly limits. */
export type AntigravityGroupKey = 'gemini' | 'claude-gpt';
export type AntigravityWindowKey = 'weekly' | 'five-hour';

export const ANTIGRAVITY_GROUP_LABELS: Record<AntigravityGroupKey, string> = {
  gemini: 'Gemini models',
  'claude-gpt': 'Claude and GPT models',
};

export const ANTIGRAVITY_WINDOW_LABELS: Record<AntigravityWindowKey, string> = {
  'five-hour': '5-hour limit',
  weekly: 'Weekly limit',
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
const TOKEN_KEYS = ['tokenType', 'token_type'];
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
  'weeklyQuotaInfo',
  'fiveHourQuotaInfo',
]);

const WEEK_HINT = /week|7.?day|seven/i;
const FIVE_HOUR_HINT = /hour|session|5.?hour|five|quota/i;
const WEEKLY_RESET_THRESHOLD_MS = 36 * 60 * 60 * 1000;

type RawEntry = {
  modelKey: string | null;
  path: string[];
  tokenType: string | null;
  remaining: number;
  resetTime: string | null;
};

function collect(node: unknown, path: string[], out: RawEntry[]): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, path, out);
    return;
  }
  const record = node as Record<string, unknown>;
  const remaining = pickNumber(record, REMAINING_KEYS);
  if (remaining !== null && remaining >= 0 && remaining <= 1) {
    out.push({
      modelKey: pickString(record, MODEL_KEYS) ?? modelKeyFromPath(path),
      path,
      tokenType: pickString(record, TOKEN_KEYS),
      remaining,
      resetTime: pickString(record, RESET_KEYS),
    });
  }
  for (const [key, child] of Object.entries(record)) {
    if (child !== null && typeof child === 'object') {
      collect(child, [...path, key], out);
    }
  }
}

function modelKeyFromPath(path: readonly string[]): string | null {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const key = path[index];
    if (!WRAPPER_KEYS.has(key)) return key;
  }
  return null;
}

/** Maps a model id to its shared Antigravity quota pool. */
export function antigravityGroupOf(
  modelId: string,
): AntigravityGroupKey | null {
  const value = modelId.toLowerCase();
  if (
    value.includes('claude') ||
    value.includes('gpt') ||
    value.includes('oss')
  )
    return 'claude-gpt';
  if (value.includes('gemini')) return 'gemini';
  return null;
}

function windowKeyOf(entry: RawEntry, now: number): AntigravityWindowKey {
  const tokens = [...entry.path, entry.tokenType ?? ''].join(' ');
  if (WEEK_HINT.test(tokens)) return 'weekly';
  if (FIVE_HOUR_HINT.test(tokens)) return 'five-hour';
  const reset = entry.resetTime ? Date.parse(entry.resetTime) : Number.NaN;
  if (Number.isFinite(reset) && reset - now > WEEKLY_RESET_THRESHOLD_MS) {
    return 'weekly';
  }
  return 'five-hour';
}

function earlierReset(
  a: string | null | undefined,
  b: string | null,
): string | null {
  if (!a) return b;
  if (!b) return a;
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  if (!Number.isFinite(aTime)) return b;
  if (!Number.isFinite(bTime)) return a;
  return bTime < aTime ? b : a;
}

/**
 * Turns Code Assist quota payloads (`fetchAvailableModels` and
 * `retrieveUserQuota`) into hourly/weekly windows per shared model pool,
 * without listing every model.
 */
export function parseGroupedQuota(
  json: unknown,
  now = Date.now(),
): UsageWindow[] {
  const raw: RawEntry[] = [];
  collect(json, [], raw);

  const merged = new Map<
    string,
    {
      group: AntigravityGroupKey;
      window: AntigravityWindowKey;
      remaining: number;
      resetTime: string | null;
    }
  >();

  for (const entry of raw) {
    if (!entry.modelKey) continue;
    const group = antigravityGroupOf(entry.modelKey);
    if (!group) continue;
    const window = windowKeyOf(entry, now);
    const key = `${group}.${window}`;
    const existing = merged.get(key);
    const resetTime = earlierReset(existing?.resetTime, entry.resetTime);
    if (!existing || entry.remaining < existing.remaining) {
      merged.set(key, { group, window, remaining: entry.remaining, resetTime });
    } else {
      merged.set(key, { ...existing, resetTime });
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (a.group !== b.group) return a.group === 'gemini' ? -1 : 1;
      return a.window === 'five-hour' ? -1 : 1;
    })
    .map((item) =>
      deriveWindow({
        externalKey: `antigravity.${item.group}.${item.window}`,
        kind: item.window === 'weekly' ? 'weekly' : 'rolling',
        label: ANTIGRAVITY_WINDOW_LABELS[item.window],
        used: ((1 - item.remaining) * 100).toFixed(1),
        limit: '100',
        unit: 'percent',
        resetsAt: item.resetTime,
        derivation: 'provider',
      }),
    );
}

/** Merges grouped windows from multiple payloads, keeping the worst reading. */
export function mergeAntigravityWindows(
  lists: readonly UsageWindow[][],
): UsageWindow[] {
  const byKey = new Map<string, UsageWindow>();
  for (const list of lists) {
    for (const window of list) {
      const existing = byKey.get(window.externalKey);
      if (!existing) {
        byKey.set(window.externalKey, window);
        continue;
      }
      const keep =
        (window.utilization ?? 0) > (existing.utilization ?? 0)
          ? window
          : existing;
      byKey.set(window.externalKey, {
        ...keep,
        resetsAt: earlierReset(existing.resetsAt, window.resetsAt),
      });
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.externalKey.localeCompare(b.externalKey),
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

type Payload = { status: number; text: string; json: unknown };

/** POSTs a request and never throws, so a single failing endpoint is not fatal. */
async function safePost(
  fetchImpl: AntigravityFetch,
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<Payload> {
  try {
    const response = await fetchImpl(url, { method: 'POST', headers, body });
    const text = await response.text();
    return { status: response.status, text, json: safeJson(text) };
  } catch (error) {
    return {
      status: 0,
      text: error instanceof Error ? error.message : String(error),
      json: null,
    };
  }
}

/**
 * Loads the signed-in account's Cloud Code Assist quota, mirroring the official
 * client flow: `loadCodeAssist` resolves the project/plan (onboarding via
 * `onboardUser` when the account has no managed project yet), then
 * `fetchAvailableModels` and `retrieveUserQuota` supply the per-pool
 * hourly/weekly limits.
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
      projectId =
        extractProjectId(record?.response) ??
        (record?.done ? null : extractProjectId(record));
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

  const body = buildProjectBody(projectId);
  const models = await safePost(
    fetchImpl,
    ANTIGRAVITY_MODELS_ENDPOINT,
    headers,
    body,
  );
  const quota = await safePost(
    fetchImpl,
    ANTIGRAVITY_QUOTA_ENDPOINT,
    headers,
    body,
  );

  const windows = mergeAntigravityWindows([
    models.json ? parseGroupedQuota(models.json) : [],
    quota.json ? parseGroupedQuota(quota.json) : [],
  ]);

  if (windows.length === 0) {
    detail =
      `models HTTP ${models.status}: ${snippet(models.text)} · ` +
      `quota HTTP ${quota.status}: ${snippet(quota.text)}`;
  } else {
    detail = `models HTTP ${models.status}, quota HTTP ${quota.status}`;
  }

  return { windows, projectId, plan, detail };
}

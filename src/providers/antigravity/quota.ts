import { deriveWindow, type UsageWindow } from '@/domain/usage';

export const ANTIGRAVITY_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
export const ANTIGRAVITY_API_VERSION = 'v1internal';
export const ANTIGRAVITY_LOAD_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:loadCodeAssist`;
export const ANTIGRAVITY_ONBOARD_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:onboardUser`;
export const ANTIGRAVITY_MODELS_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:fetchAvailableModels`;
export const ANTIGRAVITY_QUOTA_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:retrieveUserQuota`;
export const ANTIGRAVITY_SUMMARY_ENDPOINT = `${ANTIGRAVITY_ENDPOINT}/${ANTIGRAVITY_API_VERSION}:retrieveUserQuotaSummary`;
export const ANTIGRAVITY_DAILY_SUMMARY_ENDPOINT = `https://daily-cloudcode-pa.googleapis.com/${ANTIGRAVITY_API_VERSION}:retrieveUserQuotaSummary`;

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

type RawEntry = {
  modelKey: string | null;
  path: string[];
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
 * Legacy Code Assist model endpoints only report the 5-hour window. Never
 * infer a weekly window from a long reset time: an exhausted 5-hour pool can
 * also have a multi-day reset when the weekly limit has been reached.
 */
export function parseGroupedQuota(json: unknown): UsageWindow[] {
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
    const window = 'five-hour';
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
        used: ((1 - item.remaining) * 100).toFixed(4),
        limit: '100',
        unit: 'percent',
        resetsAt: item.resetTime,
        derivation: 'provider',
      }),
    );
}

/**
 * The quota-summary endpoint reports the actual shared-pool windows. Return
 * null when this is not a summary so callers can fall back to the legacy 5h
 * endpoint; an empty summary is still an authoritative response.
 */
export function parseQuotaSummary(json: unknown): UsageWindow[] | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;
  const wrapped = root.response;
  const summary =
    wrapped && typeof wrapped === 'object'
      ? (wrapped as Record<string, unknown>)
      : root;
  if (!Array.isArray(summary.groups)) return null;

  const bucketWindows: Record<
    string,
    [AntigravityGroupKey, AntigravityWindowKey]
  > = {
    'gemini-5h': ['gemini', 'five-hour'],
    'gemini-weekly': ['gemini', 'weekly'],
    '3p-5h': ['claude-gpt', 'five-hour'],
    '3p-weekly': ['claude-gpt', 'weekly'],
  };
  const windows = new Map<string, UsageWindow>();
  for (const group of summary.groups) {
    if (!group || typeof group !== 'object') continue;
    const buckets = (group as Record<string, unknown>).buckets;
    if (!Array.isArray(buckets)) continue;
    for (const bucket of buckets) {
      if (!bucket || typeof bucket !== 'object') continue;
      const entry = bucket as Record<string, unknown>;
      const id = entry.bucketId;
      if (typeof id !== 'string' || !Object.hasOwn(bucketWindows, id)) continue;
      if (windows.has(id)) continue;
      // A missing fraction means unknown, not 100% or 0% used.
      const fraction = pickNumber(entry, ['remainingFraction']);
      if (fraction === null || fraction < 0 || fraction > 1) continue;
      const [pool, window] = bucketWindows[id];
      windows.set(
        id,
        deriveWindow({
          externalKey: `antigravity.${pool}.${window}`,
          kind: window === 'weekly' ? 'weekly' : 'rolling',
          label: ANTIGRAVITY_WINDOW_LABELS[window],
          used: ((1 - fraction) * 100).toFixed(4),
          limit: '100',
          unit: 'percent',
          resetsAt: pickString(entry, RESET_KEYS),
          derivation: 'provider',
        }),
      );
    }
  }
  return [...windows.values()];
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
 * `retrieveUserQuotaSummary` supplies the actual pooled 5-hour and weekly
 * windows. Older accounts/endpoints fall back to per-model 5-hour data.
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

  // The Antigravity client uses the daily Cloud Code host first; older
  // accounts/builds may only support the endpoint on one of the two hosts.
  const summaryStatuses: number[] = [];
  for (const url of [
    ANTIGRAVITY_DAILY_SUMMARY_ENDPOINT,
    ANTIGRAVITY_SUMMARY_ENDPOINT,
  ]) {
    const summary = await safePost(fetchImpl, url, headers, '{}');
    summaryStatuses.push(summary.status);
    if (summary.status >= 200 && summary.status < 300) {
      const windows = parseQuotaSummary(summary.json);
      if (windows !== null) {
        return {
          windows,
          projectId,
          plan,
          detail: `summary HTTP ${summary.status}${windows.length === 0 ? ': no usable buckets' : ''}`,
        };
      }
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
      `summary HTTP ${summaryStatuses.join('/')}: unavailable · ` +
      `models HTTP ${models.status}: ${snippet(models.text)} · ` +
      `quota HTTP ${quota.status}: ${snippet(quota.text)}`;
  } else {
    detail = `summary HTTP ${summaryStatuses.join('/')}, models HTTP ${models.status}, quota HTTP ${quota.status} (5-hour only)`;
  }

  return { windows, projectId, plan, detail };
}

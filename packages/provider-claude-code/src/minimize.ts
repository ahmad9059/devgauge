import type { MinimizedSnapshot } from "./schema.js";
import { minimizedSnapshotSchema } from "./schema.js";

export interface MinimizeInput {
  deviceId: string;
  claudeCodeVersion?: string;
  capturedAt: string;
  localSequence: number;
}

export const MAX_STATUSLINE_BYTES = 512 * 1024;
export const MAX_DEPTH = 6;

export class MinimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinimizeError";
  }
}

/**
 * Extract only the known `rate_limits` windows from an arbitrary parsed
 * statusLine object, reconstructing a brand-new allowlisted payload.
 *
 * The raw input is never spread, stringified, or forwarded. Unknown top-level
 * keys and unknown window ids are intentionally dropped. Rejecting (rather than
 * ignoring) is reserved for oversized input and obviously hostile shapes.
 */
export const minimizeStatusLine = (input: unknown, meta: MinimizeInput): MinimizedSnapshot => {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new MinimizeError("statusLine must be a JSON object");
  }
  if (Buffer.byteLength(JSON.stringify(input), "utf8") > MAX_STATUSLINE_BYTES) {
    throw new MinimizeError("statusLine exceeds size limit");
  }

  const source = input as Record<string, unknown>;

  const rate_limits = source.rate_limits;
  const windows: Record<string, { used_percentage: number; resets_at: number }> = {};
  if (rate_limits !== undefined) {
    if (rate_limits === null || typeof rate_limits !== "object" || Array.isArray(rate_limits)) {
      throw new MinimizeError("rate_limits must be an object when present");
    }
    const limits = rate_limits as Record<string, unknown>;
    for (const id of ["five_hour", "seven_day", "spend_limit"]) {
      const value = limits[id];
      if (value === undefined) continue;
      const parsed = parseWindow(id, value);
      if (parsed) windows[id] = parsed;
    }
  }

  const out: MinimizedSnapshot = {
    schemaVersion: 1,
    deviceId: meta.deviceId,
    capturedAt: meta.capturedAt,
    localSequence: meta.localSequence,
    ...(meta.claudeCodeVersion ? { claudeCodeVersion: meta.claudeCodeVersion } : {}),
    ...(Object.keys(windows).length > 0 ? { rateLimits: windows } : {}),
  };

  return minimizedSnapshotSchema.parse(out);
};

const parseWindow = (
  id: string,
  value: unknown
): { used_percentage: number; resets_at: number } | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const w = value as Record<string, unknown>;
  const used = w.used_percentage;
  const resets = w.resets_at;
  if (typeof used !== "number" || Number.isNaN(used)) return null;
  if (typeof resets !== "number" || !Number.isFinite(resets)) return null;
  void id;
  return { used_percentage: used, resets_at: Math.floor(resets) };
};

/** True when a value contains a prohibited field (used by doctor/preview tooling). */
export const FORBIDDEN_KEYS = [
  "cwd",
  "path",
  "transcript",
  "session",
  "prompt",
  "repository",
  "repo",
  "branch",
  "token",
  "authorization",
  "oauth",
  "email",
  "metadata",
] as const;

export const hasProhibitedKey = (value: unknown): boolean => {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.some((k) => key.toLowerCase().includes(k))) return true;
    if (hasProhibitedKey(record[key])) return true;
  }
  return false;
};

/**
 * Redaction preview diagnostic. Builds a synthetic sample (never the user's
 * real input) showing exactly which fields are included vs excluded.
 */
export const previewRedaction = (): {
  included: string[];
  excluded: readonly string[];
  sample: Record<string, unknown>;
} => ({
  included: ["rate_limits.five_hour", "rate_limits.seven_day", "rate_limits.spend_limit", "capturedAt", "deviceId"],
  excluded: [...FORBIDDEN_KEYS],
  sample: {
    rate_limits: { five_hour: { used_percentage: 0, resets_at: 0 } },
    capturedAt: "2026-01-01T00:00:00Z",
  },
});
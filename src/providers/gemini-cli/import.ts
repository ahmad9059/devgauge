import type { Database } from '@/storage/database';
import { saveManualImport } from '@/storage/repositories/usage';
import type { UsageSnapshotRecord, UsageWindowRecord } from '@/storage/types';

import { normalizeGeminiCliStats } from './normalize';
import { geminiCliStatsSchema, type GeminiCliStats } from './schema';

export function parseGeminiCliStats(raw: unknown): GeminiCliStats {
  return geminiCliStatsSchema.parse(raw);
}

export type GeminiCliImportResult = {
  snapshotId: string;
  isPartial: boolean;
  coverage: GeminiCliStats['coverage'];
  capturedAt: string;
  windowCount: number;
};

export type GeminiCliImportInput = {
  db: Database;
  connectionId: string;
  raw: unknown;
  now: Date;
  nextId: () => string;
};

/**
 * Persists user-shared CLI figures as a manual snapshot with coverage metadata.
 * Never merges Gemini Apps chat limits, never imports CLI credentials, and never
 * marks the connection live.
 */
export async function importGeminiCliStats(
  input: GeminiCliImportInput,
): Promise<GeminiCliImportResult> {
  const stats = parseGeminiCliStats(input.raw);
  const normalized = normalizeGeminiCliStats(stats, input.now.toISOString());
  const snapshotId = input.nextId();

  const snapshot: UsageSnapshotRecord = {
    id: snapshotId,
    connectionId: input.connectionId,
    fetchedAt: normalized.fetchedAt,
    source: 'manual',
    providerSchemaVersion: normalized.schemaVersion,
    isPartial: normalized.isPartial,
    responseFingerprint: null,
    createdAt: input.now.toISOString(),
  };
  const windows: UsageWindowRecord[] = normalized.windows.map((window) => ({
    id: input.nextId(),
    snapshotId,
    externalKey: window.externalKey,
    kind: window.kind,
    label: window.label,
    usedDecimal: window.used,
    limitDecimal: window.limit,
    remainingDecimal: window.remaining,
    utilization: window.utilization,
    unit: window.unit,
    currencyCode: window.currencyCode,
    periodStartsAt: window.periodStartsAt,
    periodEndsAt: window.periodEndsAt,
    resetsAt: window.resetsAt,
    derivation: window.derivation,
  }));

  await saveManualImport(input.db, {
    snapshot,
    windows,
    cliStats: {
      snapshotId,
      cliVersion: stats.cliVersion ?? null,
      capturedAt: normalized.fetchedAt,
      coverage: stats.coverage,
      createdAt: input.now.toISOString(),
    },
  });

  return {
    snapshotId,
    isPartial: normalized.isPartial,
    coverage: stats.coverage,
    capturedAt: normalized.fetchedAt,
    windowCount: windows.length,
  };
}

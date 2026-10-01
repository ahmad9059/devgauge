export type ThresholdRule = {
  id: string;
  providerId: string | null;
  connectionId?: string | null;
  windowKey?: string | null;
  enabled: boolean;
  /** Ratio where 1 = 100%. */
  threshold: number;
};

export type ThresholdCandidate = {
  providerId: string;
  connectionId: string;
  windowKey: string;
  /** Absolute reset/period identity; null stays a single unknown cycle. */
  cycleId: string | null;
  utilization: number | null;
};

export type ThresholdIntent = {
  key: string;
  ruleId: string;
  connectionId: string;
  windowKey: string;
};

export function thresholdIntentKey(
  ruleId: string,
  connectionId: string,
  windowKey: string,
  cycleId: string | null = null,
): string {
  return JSON.stringify([
    ruleId,
    connectionId,
    windowKey,
    cycleId ?? 'unknown',
  ]);
}

/**
 * Evaluates threshold rules against current windows. It only fires at/above the
 * threshold, ignores unknown utilization, and skips intents already notified so
 * re-evaluation on startup/foreground/manual refresh never duplicates.
 */
export function evaluateThresholds(
  rules: readonly ThresholdRule[],
  candidates: readonly ThresholdCandidate[],
  alreadyNotified: ReadonlySet<string>,
): ThresholdIntent[] {
  const intents: ThresholdIntent[] = [];
  const seen = new Set(alreadyNotified);
  for (const rule of rules) {
    if (
      !rule.enabled ||
      !Number.isFinite(rule.threshold) ||
      rule.threshold <= 0 ||
      rule.threshold > 1
    )
      continue;
    for (const candidate of candidates) {
      if (rule.providerId !== null && rule.providerId !== candidate.providerId)
        continue;
      if (rule.connectionId && rule.connectionId !== candidate.connectionId)
        continue;
      if (rule.windowKey && rule.windowKey !== candidate.windowKey) continue;
      if (
        candidate.utilization === null ||
        !Number.isFinite(candidate.utilization)
      )
        continue;
      if (candidate.utilization < rule.threshold) continue;
      const key = thresholdIntentKey(
        rule.id,
        candidate.connectionId,
        candidate.windowKey,
        candidate.cycleId,
      );
      if (seen.has(key)) continue;
      seen.add(key);
      intents.push({
        key,
        ruleId: rule.id,
        connectionId: candidate.connectionId,
        windowKey: candidate.windowKey,
      });
    }
  }
  return intents;
}

/** Generic lock-screen copy: no provider identifiers, amounts, or account data. */
export function thresholdNotificationCopy(): { title: string; body: string } {
  return {
    title: 'DevGauge',
    body: 'A provider usage window crossed a threshold.',
  };
}

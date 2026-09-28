export type ThresholdRule = {
  id: string;
  providerId: string;
  enabled: boolean;
  /** Ratio where 1 = 100%. */
  threshold: number;
};

export type ThresholdCandidate = {
  connectionId: string;
  windowKey: string;
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
): string {
  return `${ruleId}:${connectionId}:${windowKey}`;
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
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const candidate of candidates) {
      if (candidate.utilization === null) continue;
      if (candidate.utilization < rule.threshold) continue;
      const key = thresholdIntentKey(
        rule.id,
        candidate.connectionId,
        candidate.windowKey,
      );
      if (alreadyNotified.has(key)) continue;
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

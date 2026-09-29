import type { RawWindow } from './usage-extract';
import type { WindowKeyMap } from './usage-extract';

/**
 * Parses visible page text into usage windows. It complements JSON capture for
 * first-party pages whose payload shape is unknown: it recognizes
 * "NN% remaining", "NN% used", "X / Y credits|requests", and "Resets …".
 */
const REMAINING = /(\d+(?:\.\d+)?)\s*%\s*remaining/i;
const USED = /(\d+(?:\.\d+)?)\s*%\s*used/i;
const FRACTION =
  /(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*(ai credits|credits|requests|tokens)?/i;
const RESET = /resets?\s+(in\s+[^,.\n]+|on\s+[^,.\n]+)/i;

function sectionKey(line: string, keyMap: WindowKeyMap): string | null {
  const lower = line.toLowerCase();
  for (const key of Object.keys(keyMap)) {
    if (lower.includes(key.replace(/_/g, ' ')) || lower.includes(key)) {
      return key;
    }
    const label = keyMap[key].label.toLowerCase();
    if (label.length > 3 && lower.includes(label)) return key;
  }
  if (/5[-\s]?hour|five[-\s]?hour/.test(lower)) {
    return Object.keys(keyMap).find((k) => /five|primary|hour/.test(k)) ?? null;
  }
  if (/weekly|seven[-\s]?day/.test(lower)) {
    return (
      Object.keys(keyMap).find((k) => /seven|weekly|secondary/.test(k)) ?? null
    );
  }
  if (/monthly|workspace|billing/.test(lower)) {
    return Object.keys(keyMap).find((k) => /monthly|billing/.test(k)) ?? null;
  }
  if (/credits?/.test(lower)) {
    return Object.keys(keyMap).find((k) => /credit/.test(k)) ?? null;
  }
  return null;
}

function number(value: string): number {
  return Number(value.replace(/,/g, ''));
}

export function parseUsageText(
  text: string,
  keyMap: WindowKeyMap,
): RawWindow[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const out: RawWindow[] = [];
  let currentKey: string | null = null;
  let pendingReset: string | null = null;
  let last: RawWindow | null = null;
  const lastWindow = (): RawWindow | null => last;

  const push = (usedPercent: number): void => {
    if (!currentKey) return;
    const window: RawWindow = {
      key: currentKey,
      usedPercent,
      resetsAt: pendingReset,
    };
    pendingReset = null;
    last = window;
    out.push(window);
  };

  for (const line of lines) {
    const key = sectionKey(line, keyMap);
    if (key) currentKey = key;

    const reset = RESET.exec(line);
    if (reset) {
      const value = reset[1].trim();
      const previous = lastWindow();
      // A reset line applies to the value above it; otherwise to the next one.
      if (previous !== null && previous.resetsAt === null) {
        previous.resetsAt = value;
      } else {
        pendingReset = value;
      }
    }

    const remaining = REMAINING.exec(line);
    if (remaining) {
      push(Math.max(0, 100 - number(remaining[1])));
      continue;
    }
    const used = USED.exec(line);
    if (used) {
      push(number(used[1]));
      continue;
    }
    const fraction = FRACTION.exec(line);
    if (fraction) {
      const limit = number(fraction[2]);
      if (limit > 0) push((number(fraction[1]) / limit) * 100);
      continue;
    }
    // Bare "NN%" under a section heading (e.g. "5-HOUR LIMIT 89%") is used.
    const bare = /(?:^|[^\d.])(\d+(?:\.\d+)?)%\s*$/.exec(line);
    if (bare) push(number(bare[1]));
  }

  return out;
}

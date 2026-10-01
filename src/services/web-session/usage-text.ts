import type { RawWindow, WindowKeyMap } from './usage-extract';

/**
 * Parses visible page text into usage windows. It complements JSON capture for
 * first-party pages whose payload shape is unknown: it recognizes
 * "NN% remaining", "NN% used", "X / Y credits|requests", and "Resets …".
 */
const REMAINING = /(\d+(?:\.\d+)?)\s*%\s*remaining/i;
const USED = /(\d+(?:\.\d+)?)\s*%\s*used/i;
const FRACTION =
  /(\d[\d,]*(?:\.\d+)?)\s*(?:\/|of)\s*(\d[\d,]*(?:\.\d+)?)\s*(ai credits|credits|requests|tokens)?/i;
// Codex writes absolute reset dates as "Resets Oct 1, 2026 12:29 AM";
// other providers use "Resets in …" or "Resets on …". Preserve all of them.
const RESET = /resets?\s+(.+)/i;

function sectionKey(line: string, keyMap: WindowKeyMap): string | null {
  const lower = line.toLowerCase();
  if (keyMap.five_hour && /^current session$/i.test(line)) return 'five_hour';
  if (keyMap.seven_day && /^all models$/i.test(line)) return 'seven_day';
  if (keyMap.seven_day_opus && /^opus(?: only)?$/i.test(line))
    return 'seven_day_opus';
  if (keyMap.seven_day_sonnet && /^sonnet(?: only)?$/i.test(line))
    return 'seven_day_sonnet';
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

  for (const [index, line] of lines.entries()) {
    const key = sectionKey(line, keyMap);
    if (key && key !== currentKey) {
      currentKey = key;
      pendingReset = null;
      last = null;
    }

    // Some responsive layouts put the reset label and its value into separate
    // blocks, producing "Resets" then the date/time on the next text line.
    if (/^resets?$/i.test(line)) {
      const value = lines[index + 1]?.trim();
      const previous = lastWindow();
      if (value && previous !== null && previous.resetsAt === null) {
        previous.resetsAt = value;
      } else if (value) {
        pendingReset = value;
      }
      continue;
    }

    const reset = RESET.exec(line);
    if (reset) {
      const fractionIndex = FRACTION.exec(reset[1])?.index;
      const value = reset[1].slice(0, fractionIndex ?? reset[1].length).trim();
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
      if (limit > 0) {
        const used = number(fraction[1]);
        const usedPercent = (used / limit) * 100;
        const unit = fraction[3]
          ?.toLowerCase()
          .replace('ai ', '') as RawWindow['unit'];
        const previous = lastWindow();
        if (previous && previous.key === currentKey && unit) {
          Object.assign(previous, { usedPercent, used, limit, unit });
        } else {
          push(usedPercent);
          const current = lastWindow();
          if (current && unit) Object.assign(current, { used, limit, unit });
        }
      }
      continue;
    }
    // Some sites split the percentage and "remaining" into separate text nodes.
    // Treat the adjacent qualifier as part of the value before considering it used.
    const bare = /(?:^|[^\d.])(\d+(?:\.\d+)?)%\s*$/.exec(line);
    if (bare) {
      const qualifier = lines[index + 1]?.toLowerCase().trim();
      const value = number(bare[1]);
      if (qualifier === 'remaining') {
        push(Math.max(0, 100 - value));
      } else if (qualifier === 'used') {
        push(value);
      } else {
        // Codex's responsive page can omit the remaining qualifier entirely.
        push(
          currentKey && keyMap[currentKey].remaining
            ? Math.max(0, 100 - value)
            : value,
        );
      }
    }
  }

  return out;
}

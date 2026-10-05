import type { RawWindow, WindowKeyMap } from './usage-extract';

const PERCENT =
  /(?:^|[^\w.,+-])(\d+(?:[.,]\d+)?)\s*%\s*(?:(remaining|left|available|used|consumed|utilized)\b)?/i;
const FRACTION =
  /(\d[\d,\u00a0\u202f]*(?:\.\d+)?)\s*(?:\/|of)\s*(\d[\d,\u00a0\u202f]*(?:\.\d+)?)\s*(?:monthly\s+)?(ai\s+credits?|credits?|requests?|tokens?)?/i;
const STOP_SECTION =
  /^(?:additional usage|features|usage limit resets|daily usage|analytics|usage history|full reset|available resets?|buy credits|purchase credits|history)\b/i;

function keyForKind(keyMap: WindowKeyMap, kind: string): string | null {
  return Object.keys(keyMap).find((key) => keyMap[key].kind === kind) ?? null;
}

function sectionKey(line: string, keyMap: WindowKeyMap): string | null {
  // Value/reset lines and descriptions cannot switch the active quota section.
  if (
    /^resets?\b|^[-+]?\d[\d, .]*\s*(?:%|\/|of\b)|\b(?:are set|shared across|not included|approximate|delayed by)\b/i.test(
      line,
    )
  )
    return null;
  if (/^current session\b/i.test(line) && keyMap.five_hour) return 'five_hour';
  if (/^all models$/i.test(line) && keyMap.seven_day) return 'seven_day';
  if (/^opus(?: only)?$/i.test(line) && keyMap.seven_day_opus)
    return 'seven_day_opus';
  if (/^sonnet(?: only)?$/i.test(line) && keyMap.seven_day_sonnet)
    return 'seven_day_sonnet';
  if (
    /^(?:5\s*[- ]?\s*(?:hours?|hr)|five[- ]?hour|hourly|rolling|current session)\b/i.test(
      line,
    )
  )
    return keyForKind(keyMap, 'rolling');
  if (/^(?:weekly|seven[- ]?day|7[- ]?day)\b/i.test(line))
    return keyForKind(keyMap, 'weekly');
  if (/^(?:workspace monthly|monthly|billing)\b/i.test(line))
    return keyForKind(keyMap, 'monthly');
  if (/^included usage$/i.test(line) && keyMap.ai_credit) return 'ai_credit';
  if (/^(?:included )?(?:ai )?credits?\b/i.test(line)) {
    return keyMap.workspace_monthly
      ? 'workspace_monthly'
      : keyMap.credits
        ? 'credits'
        : keyForKind(keyMap, 'monthly');
  }
  for (const key of Object.keys(keyMap)) {
    if (
      line.toLowerCase() === key.replace(/_/g, ' ') ||
      line.toLowerCase() === key
    )
      return key;
    const label = keyMap[key].label;
    if (line.toLowerCase() === label.toLowerCase()) return key;
  }
  return null;
}

function count(value: string): number {
  return Number(value.replace(/[,\s\u00a0\u202f]/g, ''));
}

function validNumber(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER / 100
  );
}

/** Parse only recognized quota sections; usage history and reset purchases are not quotas. */
export function parseUsageText(
  text: string,
  keyMap: WindowKeyMap,
): RawWindow[] {
  if (typeof text !== 'string' || text.length > 60000) return [];
  const normalized = text
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-');
  // Joining only numeric percentages and their qualifiers handles split DOM
  // nodes without joining unrelated headings, dates or credit counts.
  const lines = normalized
    .replace(
      /(\d+(?:[.,]\d+)?)\s*%\s*(remaining|left|available|used|consumed|utilized)\b/gi,
      '$1% $2',
    )
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1%')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2000);
  const out = new Map<string, RawWindow>();
  let currentKey: string | null = null;
  let pendingReset: string | null = null;
  let last: RawWindow | null = null;

  const push = (
    usedPercent: number,
    quantities?: Pick<RawWindow, 'used' | 'limit' | 'unit'>,
  ) => {
    if (!currentKey || !validNumber(usedPercent)) return;
    const prior = out.get(currentKey);
    const window: RawWindow = {
      key: currentKey,
      usedPercent,
      resetsAt:
        pendingReset ??
        (last?.key === currentKey
          ? last.resetsAt
          : prior?.usedPercent === usedPercent
            ? prior.resetsAt
            : null),
      ...quantities,
    };
    pendingReset = null;
    last = window;
    out.set(currentKey, window);
  };

  for (const [index, line] of lines.entries()) {
    if (
      /^(?:usage history|daily usage|analytics|usage limit resets|full reset|history)\b/i.test(
        line,
      )
    )
      break;
    if (STOP_SECTION.test(line)) {
      currentKey = null;
      pendingReset = null;
      last = null;
      // Everything following these sections is analytics/history, except a
      // later recognized quota heading (e.g. another Copilot quota panel).
      continue;
    }
    const key = sectionKey(line, keyMap);
    if (key && key !== currentKey) {
      currentKey = key;
      pendingReset = null;
      last = null;
    }
    if (!currentKey) continue;

    const percent = PERCENT.exec(line);
    const fraction = FRACTION.exec(line);
    const reset = /^resets?\s*(.*)/i.exec(line);
    if (reset) {
      let value = reset[1].trim();
      if (!value) {
        const next = lines[index + 1];
        if (
          next &&
          !sectionKey(next, keyMap) &&
          !STOP_SECTION.test(next) &&
          !PERCENT.test(next) &&
          !FRACTION.test(next)
        )
          value = next;
      } else {
        const start = line.indexOf(reset[1]);
        const ends = [percent?.index, fraction?.index].filter(
          (position): position is number =>
            position !== undefined && position >= start,
        );
        value = line
          .slice(start, ends.length ? Math.min(...ends) : undefined)
          .trim();
      }
      if (value && value.length <= 200) {
        const activeWindow = out.get(currentKey);
        if (activeWindow) activeWindow.resetsAt = value;
        else pendingReset = value;
      }
    }

    if (fraction) {
      if (/[+\-\d.,]$|\d[eE][+-]?\s*$/.test(line.slice(0, fraction.index)))
        continue;
      const amount = count(fraction[1]);
      const limit = count(fraction[2]);
      const unitText = fraction[3]
        ?.toLowerCase()
        .replace(/^ai\s+/, '')
        .replace(/s?$/, 's');
      const unit = ['credits', 'requests', 'tokens'].includes(unitText ?? '')
        ? (unitText as RawWindow['unit'])
        : undefined;
      const qualifier = line.slice(fraction.index + fraction[0].length).trim();
      const isRemaining = /^(?:remaining|left|available)\b/i.test(qualifier);
      if (
        validNumber(amount) &&
        validNumber(limit) &&
        limit > 0 &&
        (!isRemaining || amount <= limit)
      ) {
        const used = isRemaining ? limit - amount : amount;
        push((used / limit) * 100, unit ? { used, limit, unit } : undefined);
      }
      continue;
    }
    if (percent) {
      const value = Number(percent[1].replace(',', '.'));
      const prefix = line.slice(0, percent.index);
      if (!validNumber(value) || /\d[eE][+-]?\s*$/.test(prefix)) continue;
      const qualifier =
        percent[2]?.toLowerCase() ??
        /(remaining|left|available|used|consumed|utilized)\s*:?\s*$/i
          .exec(prefix)?.[1]
          .toLowerCase();
      const isRemaining = qualifier
        ? /^(remaining|left|available)$/.test(qualifier)
        : keyMap[currentKey].remaining === true;
      if (isRemaining && value > 100) continue;
      push(isRemaining ? 100 - value : value);
    }
  }
  return [...out.values()];
}

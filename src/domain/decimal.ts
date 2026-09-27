// Canonical non-negative base-10 decimal arithmetic. Quantities are kept as
// strings so large counters and currency values never lose precision through
// IEEE-754 (DATABASE.md §5, API.md §2).

export type DecimalString = string;

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

type Scaled = { value: bigint; scale: number };

function parse(value: string): Scaled {
  const match = DECIMAL.exec(value);
  if (!match) throw new Error(`Not a non-negative decimal: ${value}`);
  const fraction = match[2] ?? '';
  return { value: BigInt(match[1] + fraction), scale: fraction.length };
}

function format(value: bigint, scale: number): DecimalString {
  if (value < 0n) throw new Error('Decimal result must be non-negative');
  const digits = value.toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale > 0 ? digits.slice(digits.length - scale) : '';
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

function align(
  a: Scaled,
  b: Scaled,
): { left: bigint; right: bigint; scale: number } {
  const scale = Math.max(a.scale, b.scale);
  return {
    left: a.value * 10n ** BigInt(scale - a.scale),
    right: b.value * 10n ** BigInt(scale - b.scale),
    scale,
  };
}

export function isDecimalString(value: unknown): value is DecimalString {
  return typeof value === 'string' && DECIMAL.test(value);
}

/** Trims insignificant zeros; input must already be a decimal string. */
export function canonicalizeDecimal(value: string): DecimalString {
  const scaled = parse(value);
  return format(scaled.value, scaled.scale);
}

export function addDecimal(a: DecimalString, b: DecimalString): DecimalString {
  const { left, right, scale } = align(parse(a), parse(b));
  return format(left + right, scale);
}

export function subtractDecimal(
  a: DecimalString,
  b: DecimalString,
): DecimalString {
  const { left, right, scale } = align(parse(a), parse(b));
  if (left < right) throw new Error('Decimal subtraction would be negative');
  return format(left - right, scale);
}

export function compareDecimal(a: DecimalString, b: DecimalString): -1 | 0 | 1 {
  const { left, right } = align(parse(a), parse(b));
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isZeroDecimal(value: DecimalString): boolean {
  return parse(value).value === 0n;
}

/**
 * Best-effort numeric ratio for utilization display. Precision beyond double
 * is not required for a 0..1+ ratio, so this is the only lossy helper.
 */
export function decimalToNumber(value: DecimalString): number {
  const scaled = parse(value);
  return Number(scaled.value) / 10 ** scaled.scale;
}

// Locally generated, sortable, collision-resistant identifiers (UUIDv7-style
// intent): a fixed-width base-36 millisecond prefix keeps rows time-ordered.

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const MIN_RANDOM_BYTES = 12;

export function createSortableId(nowMs: number, random: Uint8Array): string {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error('nowMs must be a non-negative number');
  }
  if (random.length < MIN_RANDOM_BYTES) {
    throw new Error(`random must provide at least ${MIN_RANDOM_BYTES} bytes`);
  }
  const time = Math.floor(nowMs).toString(36).padStart(9, '0');
  let suffix = '';
  for (const byte of random) {
    suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  }
  return `${time}-${suffix}`;
}

export function isSortableId(value: string): boolean {
  return /^[0-9a-z]{9}-[0-9a-z]{12,}$/.test(value);
}

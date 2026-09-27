// Canonical redaction for logs, diagnostics, and any structured output. It
// masks sensitive field names and scrubs credential-shaped substrings so an
// accidental secret never leaves the device (SECURITY.md §7).

export const SENSITIVE_KEY =
  /(authorization|cookie|token|api[_-]?key|secret|password|verifier|session)/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const SECRET_PATTERNS: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bsk-[A-Za-z0-9]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g,
];

// Non-secret keys that merely contain a sensitive token as a substring.
const SAFE_KEYS = new Set([
  'errorCode',
  'error_code',
  'currencyCode',
  'currency_code',
]);

export const REDACTED = '[redacted]';

export function redactString(value: string): string {
  let result = value.replace(EMAIL, '[redacted-email]');
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}

export function redactValue(key: string, value: unknown): unknown {
  if (!SAFE_KEYS.has(key) && SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([childKey, child]) => [childKey, redactValue(childKey, child)],
      ),
    );
  }
  return value;
}

export function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      String(redactValue(key, value)),
    ]),
  );
}

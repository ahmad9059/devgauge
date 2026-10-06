import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAudit } from './audit-policy.mjs';

const advisory = {
  severity: 'high',
  url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  range: '<=3.0.3',
};
const exception = {
  package: 'braces',
  url: advisory.url,
  range: advisory.range,
  expires: '2026-11-06T00:00:00Z',
};
const now = new Date('2026-10-06T00:00:00Z');
const report = (via) => ({
  vulnerabilities: { braces: { via }, metro: { via: ['braces'] } },
  metadata: { vulnerabilities: { moderate: 0 } },
});

test('only an exact, unexpired advisory exception is accepted', () => {
  assert.equal(
    evaluateAudit(report([advisory]), [exception], now).accepted.length,
    1,
  );
  for (const changed of [
    { ...exception, package: 'another-package' },
    { ...exception, url: 'https://github.com/advisories/another-id' },
    { ...exception, range: '*' },
    { ...exception, expires: '2026-10-01T00:00:00Z' },
  ]) {
    assert.equal(
      evaluateAudit(report([advisory]), [changed], now).blocked.length,
      1,
    );
  }
});

test('new high and critical findings fail even with existing exceptions', () => {
  for (const severity of ['high', 'critical']) {
    const result = evaluateAudit(
      report([
        advisory,
        { ...advisory, severity, url: 'https://github.com/advisories/new-id' },
      ]),
      [exception],
      now,
    );
    assert.equal(result.blocked.length, 1);
  }
});

test('audit transport errors and incomplete reports cannot pass', () => {
  for (const invalid of [{}, { error: { message: 'network failure' } }]) {
    assert.throws(() => evaluateAudit(invalid, [exception], now));
  }
});

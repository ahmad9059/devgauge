import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { evaluateAudit } from './audit-policy.mjs';

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['audit', '--omit=dev', '--json'],
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);
if (result.error) throw result.error;
if (result.status !== 0 && result.status !== 1) {
  throw new Error(`npm audit failed: ${result.stderr}`);
}
const report = JSON.parse(result.stdout);
const exceptions = JSON.parse(
  readFileSync(new URL('./audit-exceptions.json', import.meta.url), 'utf8'),
);
const { blocked, accepted } = evaluateAudit(report, exceptions);
for (const finding of accepted) {
  console.log(
    `Reviewed tooling exception: ${finding.package} ${finding.advisory.url} (expires ${finding.exception.expires})\n${finding.exception.reason}`,
  );
}
for (const finding of blocked) {
  console.error(
    `Blocked ${finding.advisory.severity} advisory: ${finding.package} ${finding.advisory.url}`,
  );
}
console.log(
  `Dependency audit: ${blocked.length} unreviewed high/critical advisories, ${accepted.length} reviewed tooling exceptions; ${report.metadata.vulnerabilities.moderate} moderate findings.`,
);
if (blocked.length) process.exitCode = 1;

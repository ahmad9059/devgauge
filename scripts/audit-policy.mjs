export function evaluateAudit(report, exceptions, now = new Date()) {
  if (report.error || !report.vulnerabilities || !report.metadata) {
    throw new Error('Dependency audit did not return a valid report.');
  }
  const blocked = [];
  const accepted = [];
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    for (const advisory of vulnerability.via) {
      // Ancestor entries refer to these direct advisories by package name.
      if (typeof advisory === 'string') continue;
      if (!['high', 'critical'].includes(advisory.severity)) continue;
      const exception = exceptions.find(
        (entry) =>
          entry.package === name &&
          entry.url === advisory.url &&
          entry.range === advisory.range &&
          now.getTime() < Date.parse(entry.expires),
      );
      (exception ? accepted : blocked).push({
        package: name,
        advisory,
        ...(exception ? { exception } : {}),
      });
    }
  }
  return { blocked, accepted };
}

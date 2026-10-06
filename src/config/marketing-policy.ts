export function canUseMarketing(
  variant: unknown,
  enabled: unknown,
  packageId: unknown,
): boolean {
  return (
    variant === 'preview' &&
    enabled === true &&
    packageId === 'app.devgauge.marketing'
  );
}

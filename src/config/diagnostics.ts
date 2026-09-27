export function canUseDiagnostics(
  isDevelopment: boolean,
  appVariant: string | undefined,
  spikeTestFlag: string | undefined,
): boolean {
  return isDevelopment || (appVariant === 'preview' && spikeTestFlag === '1');
}

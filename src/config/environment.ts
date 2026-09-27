export type BuildEnvironment = 'development' | 'preview' | 'production';

export function getBuildEnvironment(
  env: Record<string, string | undefined>,
): BuildEnvironment {
  const value = env.APP_VARIANT ?? 'development';
  if (
    value === 'development' ||
    value === 'preview' ||
    value === 'production'
  ) {
    return value;
  }
  throw new Error(`Unknown APP_VARIANT: ${value}`);
}

// All values compiled into a mobile bundle are public. Provider secrets belong
// in a future server-side broker, never in EXPO_PUBLIC_* or app.config.ts.
export const publicConfig = {
  productName: 'DevGauge',
} as const;

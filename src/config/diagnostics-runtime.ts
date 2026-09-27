import Constants from 'expo-constants';

import { canUseDiagnostics } from './diagnostics';

export const diagnosticsEnabled = canUseDiagnostics(
  __DEV__,
  Constants.expoConfig?.extra?.appVariant,
  process.env.EXPO_PUBLIC_SPIKE_TEST,
);

import Constants from 'expo-constants';
import { canUseMarketing } from './marketing-policy';

/** Only an isolated preview package may seed illustrative marketing data. */
export const marketingEnabled = canUseMarketing(
  Constants.expoConfig?.extra?.appVariant,
  Constants.expoConfig?.extra?.marketingMode,
  Constants.expoConfig?.android?.package,
);

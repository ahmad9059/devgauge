import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.APP_VARIANT ?? 'development';
  if (!['development', 'preview', 'production'].includes(environment)) {
    throw new Error(`Unknown APP_VARIANT: ${environment}`);
  }
  const productionPackage = process.env.ANDROID_PACKAGE;
  const artifact = process.env.ANDROID_ARTIFACT ?? 'phone';
  if (!['universal', 'phone'].includes(artifact)) {
    throw new Error(`Unknown ANDROID_ARTIFACT: ${artifact}`);
  }
  if (environment === 'production' && !productionPackage) {
    throw new Error('ANDROID_PACKAGE is required for a production build');
  }
  if (
    productionPackage &&
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(productionPackage)
  ) {
    throw new Error(
      'ANDROID_PACKAGE must be a reverse-domain Android application ID',
    );
  }

  return {
    ...config,
    name: 'DevGauge',
    slug: 'devgauge',
    version: '0.1.0',
    orientation: 'default',
    platforms: ['android'],
    icon: './assets/icon.png',
    scheme: 'devgauge',
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            // TaskManager discovers this class by name. R8 otherwise removes
            // it, preventing WorkManager from starting a killed app headlessly.
            extraProguardRules:
              '-keep class expo.modules.adapters.react.apploader.RNHeadlessAppLoader { *; }',
            buildArchs: ['arm64-v8a'],
          },
        },
      ],
      'expo-font',
      'expo-notifications',
      'expo-background-task',
      // Required by the Expo Router config plugin in SDK 57+.
      'expo-router',
      // Google blocks OAuth inside app WebViews, so sign-in opens a Chrome
      // Custom Tab (expo-web-browser) and the code is pasted back.
      'expo-web-browser',
      // SQLCipher encrypts the local usage database; the key lives in SecureStore.
      ['expo-sqlite', { useSQLCipher: true }],
      // Excludes SecureStore ciphertext from Android backup.
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#000000',
        },
      ],
    ],
    extra: { appVariant: environment },
    android: {
      package:
        environment === 'production'
          ? productionPackage
          : `app.devgauge.${environment}`,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
        monochromeImage: './assets/monochrome-icon.png',
      },
    },
    experiments: { typedRoutes: true },
  };
};

import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = process.env.APP_VARIANT ?? 'development';
  if (!['development', 'preview', 'production'].includes(environment)) {
    throw new Error(`Unknown APP_VARIANT: ${environment}`);
  }
  const productionPackage = process.env.ANDROID_PACKAGE;
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
    name: environment === 'production' ? 'DevGauge' : `DevGauge ${environment}`,
    slug: 'devgauge',
    version: '0.1.0',
    orientation: 'default',
    platforms: ['android'],
    icon: './assets/icon.png',
    scheme: 'devgauge',
    plugins: [
      'expo-font',
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

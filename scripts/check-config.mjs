import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

for (const variant of ['development', 'preview', 'production']) {
  const output = execFileSync(
    process.platform === 'win32' ? 'node.exe' : 'node',
    ['node_modules/expo/bin/cli', 'config', '--json'],
    {
      env: {
        ...process.env,
        APP_VARIANT: variant,
        ANDROID_PACKAGE: variant === 'production' ? 'com.example.devgauge' : '',
        ANDROID_ARTIFACT: 'universal',
      },
      encoding: 'utf8',
    },
  );
  const config = JSON.parse(output);
  assert.deepEqual(config.platforms, ['android']);
  assert.equal(config.experiments.typedRoutes, true);
  assert.equal(config.scheme, 'devgauge');
  assert.equal(config.extra.appVariant, variant);
  assert.equal(
    config.android.package,
    variant === 'production'
      ? 'com.example.devgauge'
      : `app.devgauge.${variant}`,
  );
  assert.equal(config.ios, undefined);
  assert.equal(config.icon, './assets/icon.png');
  assert.equal(
    config.android.adaptiveIcon.foregroundImage,
    './assets/adaptive-icon.png',
  );
  assert.equal(
    config.android.adaptiveIcon.monochromeImage,
    './assets/monochrome-icon.png',
  );
  assert.ok(config.android.adaptiveIcon.backgroundColor);
  const properties = config.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  )?.[1]?.android;
  assert.equal(properties.enableMinifyInReleaseBuilds, true);
  assert.equal(properties.enableShrinkResourcesInReleaseBuilds, true);
  assert.deepEqual(properties.buildArchs, ['arm64-v8a']);
  assert.ok(properties.extraProguardRules.includes('RNHeadlessAppLoader'));
}

for (const [artifact, abis] of [
  ['phone', ['arm64-v8a']],
  ['universal', ['arm64-v8a']],
]) {
  const config = JSON.parse(
    execFileSync('node', ['node_modules/expo/bin/cli', 'config', '--json'], {
      env: {
        ...process.env,
        APP_VARIANT: 'preview',
        ANDROID_ARTIFACT: artifact,
      },
      encoding: 'utf8',
    }),
  );
  const properties = config.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
  )[1].android;
  assert.deepEqual(properties.buildArchs, abis);
}

assert.throws(() =>
  execFileSync('node', ['node_modules/expo/bin/cli', 'config', '--json'], {
    env: { ...process.env, APP_VARIANT: 'production', ANDROID_PACKAGE: '' },
    stdio: 'pipe',
  }),
);

console.log('Android build profiles and route config validated');

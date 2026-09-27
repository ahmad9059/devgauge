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
}

assert.throws(() =>
  execFileSync('node', ['node_modules/expo/bin/cli', 'config', '--json'], {
    env: { ...process.env, APP_VARIANT: 'production', ANDROID_PACKAGE: '' },
    stdio: 'pipe',
  }),
);

console.log('Android build profiles and route config validated');

import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdir,
  writeFile,
  copyFile,
  readdir,
  readFile,
} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const devices = execFileSync('adb', ['devices'], { encoding: 'utf8' })
  .split('\n')
  .filter((line) => /\tdevice$/.test(line))
  .map((line) => line.split('\t')[0]);
const device =
  process.env.ANDROID_SERIAL ?? (devices.length === 1 ? devices[0] : null);
if (!device)
  throw new Error('Connect one Android device, or set ANDROID_SERIAL.');
const adb = (...args) =>
  execFileSync('adb', ['-s', device, ...args], { encoding: 'utf8' }).trim();
const originalSize = adb('shell', 'wm', 'size');
const originalDensity = adb('shell', 'wm', 'density');
const originalFont = adb('shell', 'settings', 'get', 'system', 'font_scale');
const originalTimeout = adb(
  'shell',
  'settings',
  'get',
  'system',
  'screen_off_timeout',
);
const originalDemoAllowed = adb(
  'shell',
  'settings',
  'get',
  'global',
  'sysui_demo_allowed',
);
const animations = [
  'window_animation_scale',
  'transition_animation_scale',
  'animator_duration_scale',
];
const originalAnimations = animations.map((key) =>
  adb('shell', 'settings', 'get', 'global', key),
);
const restoreOverride = (output, kind) => {
  const override = /Override (?:size|density): (\S+)/.exec(output);
  adb('shell', 'wm', kind, override?.[1] ?? 'reset');
};
const captureDir = path.resolve('marketing/public/captures');
const testOutputDir = path.resolve(
  'artifacts/maestro',
  `capture-${Date.now()}`,
);
await mkdir(captureDir, { recursive: true });
let success = false;
try {
  adb('install', '-r', 'artifacts/devgauge-marketing.apk');
  adb('shell', 'wm', 'size', '1080x1920');
  adb('shell', 'wm', 'density', '256');
  adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0');
  adb('shell', 'settings', 'put', 'system', 'screen_off_timeout', '600000');
  for (const key of animations)
    adb('shell', 'settings', 'put', 'global', key, '0');
  adb('shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1');
  adb(
    'shell',
    'am',
    'broadcast',
    '-a',
    'com.android.systemui.demo',
    '-e',
    'command',
    'clock',
    '-e',
    'hhmm',
    '0941',
  );
  adb(
    'shell',
    'am',
    'broadcast',
    '-a',
    'com.android.systemui.demo',
    '-e',
    'command',
    'notifications',
    '-e',
    'visible',
    'false',
  );
  adb(
    'shell',
    'am',
    'broadcast',
    '-a',
    'com.android.systemui.demo',
    '-e',
    'command',
    'battery',
    '-e',
    'level',
    '100',
    '-e',
    'plugged',
    'false',
  );
  adb(
    'shell',
    'pm',
    'grant',
    'app.devgauge.marketing',
    'android.permission.POST_NOTIFICATIONS',
  );
  const maestro =
    process.env.MAESTRO_BIN ?? path.join(os.homedir(), '.maestro/bin/maestro');
  const result = spawnSync(
    maestro,
    [
      '--device',
      device,
      'test',
      '--test-output-dir',
      testOutputDir,
      '.maestro/store-screenshots/capture.yaml',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      'Maestro capture failed. Keep the phone unlocked and inspect artifacts/maestro.',
    );
  // A genuine wider logical viewport fits all six quota cards in one capture.
  adb('shell', 'wm', 'density', '168');
  const dashboardOutputDir = `${testOutputDir}-dashboard`;
  const dashboardResult = spawnSync(
    maestro,
    [
      '--device',
      device,
      'test',
      '--test-output-dir',
      dashboardOutputDir,
      '.maestro/store-screenshots/dashboard-all-providers.yaml',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      },
    },
  );
  if (dashboardResult.error) throw dashboardResult.error;
  if (dashboardResult.status !== 0)
    throw new Error('The all-six-provider dashboard capture failed.');
  adb('shell', 'wm', 'density', '288');
  const settingsOutputDir = `${testOutputDir}-settings`;
  const settingsResult = spawnSync(
    maestro,
    [
      '--device',
      device,
      'test',
      '--test-output-dir',
      settingsOutputDir,
      '.maestro/store-screenshots/settings.yaml',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        MAESTRO_CLI_NO_ANALYTICS: '1',
        MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
      },
    },
  );
  if (settingsResult.error) throw settingsResult.error;
  if (settingsResult.status !== 0)
    throw new Error('The Settings-tab capture failed.');
  for (const capture of [
    'dashboard',
    'providers',
    'provider-detail',
    'alerts',
    'privacy',
    'settings',
  ]) {
    const sourceDir =
      capture === 'dashboard'
        ? dashboardOutputDir
        : capture === 'settings'
          ? settingsOutputDir
          : testOutputDir;
    const sourceName =
      capture === 'dashboard' ? 'dashboard-all-providers' : capture;
    const files = await readdir(sourceDir, { recursive: true });
    const matches = files.filter(
      (file) =>
        path.basename(file) === `${sourceName}.png` &&
        file.split(path.sep).includes('takeScreenshot'),
    );
    if (matches.length !== 1)
      throw new Error(
        `Expected one Maestro capture for ${capture}; found ${matches.length}.`,
      );
    await copyFile(
      path.join(sourceDir, matches[0]),
      path.join(captureDir, `${capture}.png`),
    );
    const png = await readFile(path.join(captureDir, `${capture}.png`));
    if (png.readUInt32BE(16) !== 1080 || png.readUInt32BE(20) !== 1920) {
      throw new Error(
        `Unexpected capture dimensions for ${capture}; expected 1080 by 1920.`,
      );
    }
  }
  await writeFile(
    path.join(captureDir, 'manifest.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        device: 'Connected ARM64 Android phone',
        package: 'app.devgauge.marketing',
        data: 'illustrative sample data',
        size: '1080x1920',
        method: 'Maestro takeScreenshot',
        density: { dashboard: 168, settings: 288, otherScreens: 256 },
      },
      null,
      2,
    ) + '\n',
  );
  success = true;
} finally {
  adb(
    'shell',
    'am',
    'broadcast',
    '-a',
    'com.android.systemui.demo',
    '-e',
    'command',
    'exit',
  );
  if (originalDemoAllowed === 'null')
    adb('shell', 'settings', 'delete', 'global', 'sysui_demo_allowed');
  else
    adb(
      'shell',
      'settings',
      'put',
      'global',
      'sysui_demo_allowed',
      originalDemoAllowed,
    );
  restoreOverride(originalSize, 'size');
  restoreOverride(originalDensity, 'density');
  adb('shell', 'settings', 'put', 'system', 'font_scale', originalFont);
  adb(
    'shell',
    'settings',
    'put',
    'system',
    'screen_off_timeout',
    originalTimeout,
  );
  for (const [index, key] of animations.entries())
    adb('shell', 'settings', 'put', 'global', key, originalAnimations[index]);
  adb('shell', 'am', 'force-stop', 'app.devgauge.marketing');
}
console.log(
  success
    ? `Real application screenshots captured: ${captureDir}`
    : 'Device display settings restored after capture failure.',
);

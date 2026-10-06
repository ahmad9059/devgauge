import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  appendFile,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const started = Date.now();
const artifact = process.env.ANDROID_ARTIFACT ?? 'phone';
if (!['phone', 'universal'].includes(artifact)) {
  throw new Error(
    'ANDROID_ARTIFACT must be phone (ARM64); universal is a legacy ARM64 alias',
  );
}
process.env.ANDROID_ARTIFACT = artifact;
const production = process.env.APP_VARIANT === 'production';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const output = production
  ? `artifacts/devgauge-${version}-arm64.apk`
  : `artifacts/devgauge-preview-${artifact}.apk`;
await mkdir('artifacts', { recursive: true });
// Keep the last successful artifact until its replacement has built.
const logPath = production
  ? 'artifacts/android-build-release.log'
  : `artifacts/android-build-${artifact}.log`;
const log = createWriteStream(logPath);
const completed = new Set();
let totalTasks = 0;
let stage = 'Preparing Android project';
let percent = 0;
let lastLine = '';

function render() {
  const seconds = Math.floor((Date.now() - started) / 1000);
  const elapsed = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const filled = Math.floor(percent / 5);
  const bar = `${'='.repeat(filled)}${'-'.repeat(20 - filled)}`;
  const tasks = totalTasks ? ` | ${completed.size}/${totalTasks} tasks` : '';
  const line = `[${bar}] ${percent}% estimated | ${stage} | ${elapsed}${tasks}`;
  if (process.stdout.isTTY) {
    process.stdout.write(`\r\x1b[2K${line}`);
  } else if (line !== lastLine) {
    console.log(line);
  }
  lastLine = line;
}

async function run(command, args, cwd, onLine = () => {}) {
  log.write(`\n$ ${command} ${args.join(' ')}\n`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let tail = '';
    for (const stream of [child.stdout, child.stderr]) {
      let pending = '';
      stream.on('data', (chunk) => {
        log.write(chunk);
        tail = (tail + chunk).slice(-16000);
        pending += chunk.toString();
        const lines = pending.split(/\r?\n/);
        pending = lines.pop();
        for (const line of lines) onLine(line);
      });
      stream.on('end', () => {
        if (pending) onLine(pending);
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code})\n${tail}`));
    });
    const interrupt = () => child.kill('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    child.on('close', () => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    });
  });
}

console.log(
  'Android APK build — live progress (task counts are not time estimates).',
);
console.log(`Full build output: ${logPath}`);
render();
const ticker = setInterval(render, process.stdout.isTTY ? 1000 : 15000);
try {
  await run('npx', [
    'expo',
    'prebuild',
    '--platform',
    'android',
    '--clean',
    '--no-install',
  ]);
  if (production) {
    const credentials = JSON.parse(
      await readFile('.release/signing.json', 'utf8'),
    );
    if (!credentials.keystore || !credentials.alias || !credentials.password) {
      throw new Error('Release signing credentials are incomplete.');
    }
    process.env.DEVGAUGE_KEYSTORE = path.resolve(
      '.release',
      credentials.keystore,
    );
    process.env.DEVGAUGE_KEY_ALIAS = credentials.alias;
    process.env.DEVGAUGE_SIGNING_PASSWORD = credentials.password;
    // Applied after clean prebuild. Credentials remain in the environment,
    // outside generated source and build logs; never use the template debug key.
    await appendFile(
      'android/app/build.gradle',
      `
android {
    signingConfigs {
        devgaugeRelease {
            storeFile file(System.getenv("DEVGAUGE_KEYSTORE"))
            storePassword System.getenv("DEVGAUGE_SIGNING_PASSWORD")
            keyAlias System.getenv("DEVGAUGE_KEY_ALIAS")
            keyPassword System.getenv("DEVGAUGE_SIGNING_PASSWORD")
        }
    }
    buildTypes.release.signingConfig = signingConfigs.devgaugeRelease
}
`,
    );
  }
  stage = 'Calculating compilation tasks';
  percent = 5;
  render();
  const gradleArgs = [
    'assembleRelease',
    '--no-daemon',
    '--max-workers=2',
    '--console=plain',
  ];
  const tasks = new Set();
  await run(
    './gradlew',
    [...gradleArgs, '--dry-run'],
    path.resolve('android'),
    (line) => {
      const match = /^(\S+) SKIPPED$/.exec(line.trim());
      if (match) tasks.add(match[1]);
    },
  );
  totalTasks = tasks.size;
  percent = 10;
  stage = 'Compiling Android APK';
  render();
  await run('./gradlew', gradleArgs, path.resolve('android'), (line) => {
    const match = /^> Task (\S+)/.exec(line);
    if (!match) return;
    completed.add(match[1]);
    // Native plugins can add tasks during execution after the dry-run plan.
    totalTasks = Math.max(totalTasks, completed.size);
    percent = totalTasks
      ? Math.min(98, 10 + Math.floor((completed.size / totalTasks) * 88))
      : 10;
    stage = `Compiling ${match[1]}`;
  });
  stage = 'Copying finished APK';
  percent = 99;
  render();
  await copyFile(
    'android/app/build/outputs/apk/release/app-release.apk',
    output,
  );
  if (production) {
    const digest = createHash('sha256')
      .update(await readFile(output))
      .digest('hex');
    await writeFile(
      `${output}.sha256`,
      `${digest}  ${path.basename(output)}\n`,
    );
  }
  stage = 'Build complete';
  percent = 100;
  render();
  console.log(
    `\n${production ? 'Signed release APK' : 'Internal test APK'}: ${output}`,
  );
} catch (error) {
  console.error(`\nBuild failed. Full output: ${logPath}\n${error.message}`);
  process.exitCode = 1;
} finally {
  clearInterval(ticker);
  log.end();
}

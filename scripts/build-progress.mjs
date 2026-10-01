import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const started = Date.now();
const artifact = process.env.ANDROID_ARTIFACT ?? 'phone';
if (!['phone', 'emulator', 'universal'].includes(artifact)) {
  throw new Error('ANDROID_ARTIFACT must be phone, emulator, or universal');
}
process.env.ANDROID_ARTIFACT = artifact;
const output = `artifacts/devgauge-preview-${artifact}.apk`;
await mkdir('artifacts', { recursive: true });
// Keep the last successful artifact until its replacement has built.
const logPath = `artifacts/android-build-${artifact}.log`;
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
  stage = 'Build complete';
  percent = 100;
  render();
  console.log(`\nInternal test APK: ${output}`);
} catch (error) {
  console.error(`\nBuild failed. Full output: ${logPath}\n${error.message}`);
  process.exitCode = 1;
} finally {
  clearInterval(ticker);
  log.end();
}

import { bundle } from '@remotion/bundler';
import {
  selectComposition,
  renderStill,
  renderMedia,
} from '@remotion/renderer';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
await mkdir(path.join(publicDir, 'brand'), { recursive: true });
await mkdir(path.join(publicDir, 'fonts'), { recursive: true });
await copyFile(
  path.join(root, '../assets/readme-logo.png'),
  path.join(publicDir, 'brand/logo.png'),
);
for (const [variant, output] of [
  ['400Regular', 'Regular'],
  ['600SemiBold', 'Semibold'],
]) {
  await copyFile(
    path.join(
      root,
      `../node_modules/@expo-google-fonts/geist/${variant}/Geist_${variant}.ttf`,
    ),
    path.join(publicDir, `fonts/Geist-${output}.ttf`),
  );
}
const names = [
  '01-dashboard',
  '02-providers',
  '03-limits',
  '04-alerts',
  '05-privacy',
];
for (const capture of [
  'dashboard',
  'providers',
  'provider-detail',
  'alerts',
  'privacy',
]) {
  await access(path.join(publicDir, 'captures', `${capture}.png`));
}
const output = path.join(root, 'output');
await mkdir(path.join(output, 'playstore'), { recursive: true });
await mkdir(path.join(output, 'github'), { recursive: true });
const serveUrl = await bundle({
  entryPoint: path.join(root, 'remotion/index.ts'),
  publicDir,
});
for (let slideIndex = 0; slideIndex < names.length; slideIndex++) {
  const inputProps = { slideIndex };
  const composition = await selectComposition({
    serveUrl,
    id: 'StoreScreenshot',
    inputProps,
  });
  await renderStill({
    serveUrl,
    composition,
    inputProps,
    output: path.join(output, `playstore/${names[slideIndex]}.png`),
    imageFormat: 'png',
  });
  console.log(`Rendered ${names[slideIndex]}.png`);
}
const preview = await selectComposition({
  serveUrl,
  id: 'GithubPreview',
  inputProps: {},
});
await renderStill({
  serveUrl,
  composition: preview,
  inputProps: {},
  output: path.join(output, 'github/preview.png'),
  imageFormat: 'png',
});
const hasMagick =
  spawnSync('magick', ['-version'], { stdio: 'ignore' }).status === 0;
execFileSync(hasMagick ? 'magick' : 'montage', [
  ...(hasMagick ? ['montage'] : []),
  ...names.map((name) => path.join(output, `playstore/${name}.png`)),
  '-thumbnail',
  '270x480',
  '-tile',
  '5x1',
  '-geometry',
  '+8+8',
  '-background',
  '#161718',
  path.join(output, 'contact-sheet.png'),
]);
if (process.argv.includes('--video')) {
  const video = await selectComposition({
    serveUrl,
    id: 'ReleaseVideo',
    inputProps: {},
  });
  await renderMedia({
    serveUrl,
    composition: video,
    inputProps: {},
    codec: 'h264',
    outputLocation: path.join(output, 'github/demo.mp4'),
    scale: 0.5,
    concurrency: 2,
  });
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      path.join(output, 'github/demo.mp4'),
      '-vf',
      'fps=10,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      '-loop',
      '0',
      path.join(output, 'github/demo.gif'),
    ],
    { stdio: 'ignore' },
  );
}
console.log(`Marketing assets ready: ${output}`);

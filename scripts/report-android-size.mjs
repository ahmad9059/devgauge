import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const artifact = args[0];
if (!artifact)
  throw new Error(
    'Usage: node scripts/report-android-size.mjs artifact.apk|aab [--baseline file] [--max-mib 60]',
  );

/** Central directory sizes include compression; APK signing overhead stays separate. */
async function inspect(file) {
  const data = await readFile(file);
  let end = data.length - 22;
  const earliest = Math.max(0, data.length - 22 - 65535);
  while (
    end >= earliest &&
    (data.readUInt32LE(end) !== 0x06054b50 ||
      end + 22 + data.readUInt16LE(end + 20) !== data.length)
  )
    end--;
  if (end < earliest) throw new Error(`Not a supported ZIP artifact: ${file}`);
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16);
  if (count === 65535 || offset === 0xffffffff)
    throw new Error('ZIP64 artifacts are not supported');
  const categories = { native: 0, dex: 0, assets: 0, resourcesAndMetadata: 0 };
  const abis = {};
  const libraries = {};
  let entriesBytes = 0;
  for (let entry = 0; entry < count; entry++) {
    if (data.readUInt32LE(offset) !== 0x02014b50)
      throw new Error('Invalid central directory');
    const compressed = data.readUInt32LE(offset + 20);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const name = data
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');
    const native = /(?:^|\/)lib\/([^/]+)\/([^/]+)$/.exec(name);
    if (native) {
      categories.native += compressed;
      abis[native[1]] = (abis[native[1]] ?? 0) + compressed;
      libraries[native[2]] = (libraries[native[2]] ?? 0) + compressed;
    } else if (/\.dex$/.test(name)) categories.dex += compressed;
    else if (/(?:^|\/)assets\//.test(name)) categories.assets += compressed;
    else categories.resourcesAndMetadata += compressed;
    entriesBytes += compressed;
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return {
    file,
    bytes: data.length,
    mib: Number((data.length / 1048576).toFixed(2)),
    sha256: createHash('sha256').update(data).digest('hex'),
    abis,
    storedBytesByCategory: categories,
    zipHeadersAndSigningBytes: data.length - entriesBytes,
    largestNativeLibraries: Object.entries(libraries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15),
    measurement: file.endsWith('.aab')
      ? 'AAB upload bytes; not Play per-device download'
      : 'APK file bytes; not installed size or RAM',
  };
}

const result = await inspect(artifact);
const baselineIndex = args.indexOf('--baseline');
if (baselineIndex >= 0) {
  const baseline = await inspect(args[baselineIndex + 1]);
  result.comparison = {
    baseline,
    sameAbis:
      JSON.stringify(Object.keys(result.abis).sort()) ===
      JSON.stringify(Object.keys(baseline.abis).sort()),
    reductionPercent: Number(
      ((1 - result.bytes / baseline.bytes) * 100).toFixed(2),
    ),
  };
}
const budgetIndex = args.indexOf('--max-mib');
if (budgetIndex >= 0) {
  const budget = Number(args[budgetIndex + 1]);
  if (!Number.isFinite(budget) || budget <= 0)
    throw new Error('Budget must be a positive MiB value');
  result.budget = { mib: budget, passed: result.bytes <= budget * 1048576 };
  if (!result.budget.passed) process.exitCode = 1;
}
console.log(JSON.stringify(result, null, 2));

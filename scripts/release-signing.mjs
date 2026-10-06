import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, readFile, access, writeFile } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('.release');
const credentialsPath = path.join(directory, 'signing.json');
const keystorePath = path.join(directory, 'devgauge-release.keystore');
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);

let credentials;
try {
  credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  try {
    await access(keystorePath);
    throw new Error(
      'A release keystore exists without signing.json. Restore its credentials before building.',
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  credentials = {
    keystore: 'devgauge-release.keystore',
    alias: 'devgauge',
    password: randomBytes(32).toString('hex'),
  };
  // Write credentials first so a failed key generation never loses the password.
  await writeFile(
    credentialsPath,
    JSON.stringify(credentials, null, 2) + '\n',
    { mode: 0o600, flag: 'wx' },
  );
  const keytool = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', 'keytool')
    : 'keytool';
  execFileSync(
    keytool,
    [
      '-genkeypair',
      '-keystore',
      keystorePath,
      '-storetype',
      'PKCS12',
      '-alias',
      credentials.alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '4096',
      '-validity',
      '10000',
      '-dname',
      'CN=DevGauge, OU=Release, O=DevGauge',
      '-storepass:env',
      'DEVGAUGE_SIGNING_PASSWORD',
      '-keypass:env',
      'DEVGAUGE_SIGNING_PASSWORD',
    ],
    {
      env: { ...process.env, DEVGAUGE_SIGNING_PASSWORD: credentials.password },
      stdio: 'pipe',
    },
  );
  console.log(
    'Created the persistent release signing key in .release/. Back up this directory securely for future updates.',
  );
}

const selectedKeystore = path.resolve(directory, credentials.keystore);
await access(selectedKeystore);
await chmod(credentialsPath, 0o600);
await chmod(selectedKeystore, 0o600);
console.log('Release signing credentials are available.');

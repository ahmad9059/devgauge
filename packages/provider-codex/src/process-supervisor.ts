import { chmod, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { verifyCodexBinary } from "./binary.js";
import { archiveProfile, removePlaintextProfile, restoreProfile, type ArchivedProfile } from "./profile-artifact.js";
import { CodexSession } from "./session.js";
import { spawnCodex } from "./transport.js";

const SAFE_ENV_KEYS = ["PATH", "TZ", "LANG", "LC_ALL", "NO_COLOR", "TERM"] as const;

export interface CodexSupervisorOptions {
  binaryPath?: string;
  tempBase?: string;
  sourceEnv?: NodeJS.ProcessEnv;
  profileArtifact?: ArchivedProfile;
  persistProfile?: (artifact: ArchivedProfile) => Promise<void>;
  requestTimeoutMs?: number;
  idleTimeoutMs?: number;
  totalTimeoutMs?: number;
  verifyBinary?: boolean;
}

const isolatedEnvironment = (source: NodeJS.ProcessEnv, profileRoot: string): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  for (const key of SAFE_ENV_KEYS) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  env.HOME = profileRoot;
  env.CODEX_HOME = profileRoot;
  env.TMPDIR = join(profileRoot, "tmp");
  env.USER = "devgauge-codex";
  return env;
};

/** Runs one App Server session with a unique plaintext profile and bounded lifetime. */
export const withCodexSession = async <T>(
  options: CodexSupervisorOptions,
  task: (session: CodexSession, profileRoot: string) => Promise<T>
): Promise<T> => {
  const binaryPath = options.binaryPath ?? "codex";
  if (options.verifyBinary !== false) await verifyCodexBinary(binaryPath);

  const base = options.tempBase ?? tmpdir();
  await mkdir(base, { recursive: true, mode: 0o700 });
  const jobRoot = await mkdtemp(join(base, "devgauge-codex-"));
  const profileRoot = join(jobRoot, "profile");
  await mkdir(join(profileRoot, "tmp"), { recursive: true, mode: 0o700 });
  await chmod(jobRoot, 0o700);
  if (options.profileArtifact) await restoreProfile(profileRoot, options.profileArtifact);

  const transport = spawnCodex({
    command: binaryPath,
    cwd: jobRoot,
    env: isolatedEnvironment(options.sourceEnv ?? process.env, profileRoot),
  });
  const session = new CodexSession({
    transport,
    ...(options.requestTimeoutMs === undefined ? {} : { requestTimeoutMs: options.requestTimeoutMs }),
    ...(options.idleTimeoutMs === undefined ? {} : { idleTimeoutMs: options.idleTimeoutMs }),
  });
  const totalTimeoutMs = options.totalTimeoutMs ?? 60_000;
  let totalTimer: NodeJS.Timeout | undefined;

  try {
    await session.initialize({ name: "devgauge", title: "DevGauge", version: "0.1.0" });
    const timeout = new Promise<never>((_, reject) => {
      totalTimer = setTimeout(() => {
        session.close();
        reject(new Error("Codex process total timeout"));
      }, totalTimeoutMs);
      totalTimer.unref();
    });
    return await Promise.race([task(session, profileRoot), timeout]);
  } finally {
    if (totalTimer) clearTimeout(totalTimer);
    session.close();
    await Promise.race([transport.closed, new Promise<void>((resolve) => setTimeout(resolve, 3_000))]);
    try {
      if (options.persistProfile) await options.persistProfile(await archiveProfile(profileRoot));
    } finally {
      await removePlaintextProfile(jobRoot);
    }
  }
};

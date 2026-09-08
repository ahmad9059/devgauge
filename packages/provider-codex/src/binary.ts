import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

export const CODEX_VERSION = "0.153.4";
export const CODEX_LINUX_X64_SHA256 = "56ef98ab4032d317ab26e9b5e5a175650717351edb16ed9cde0cb6d1734d62da";
export const CODEX_DEVELOPMENT_LINUX_X64_SHA256 = "c98150daf998a9e1f39577b65436cfa77df922f4c9360760fe62e7de2d67c82b";
export const CODEX_PROTOCOL_SCHEMA_SHA256 = "eceec59c97b0c6b036095fa062df9c417a90d0d7bffa47d4a41ec064716c8bcf";
export const MIN_CODEX_VERSION = CODEX_VERSION;
export const MAX_CODEX_VERSION = CODEX_VERSION;

const execFileAsync = promisify(execFile);

export const resolveCodexBinary = async (binaryPath: string): Promise<string> => {
  if (binaryPath.includes("/")) return binaryPath;
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, binaryPath);
    if (await access(candidate, constants.X_OK).then(() => true).catch(() => false)) return candidate;
  }
  throw new Error(`Codex binary not found: ${binaryPath}`);
};

export const verifyCodexBinary = async (
  binaryPath: string,
  expectedSha256: string | readonly string[] = [CODEX_LINUX_X64_SHA256, CODEX_DEVELOPMENT_LINUX_X64_SHA256]
): Promise<void> => {
  const resolvedPath = await resolveCodexBinary(binaryPath);
  const [{ stdout }, bytes] = await Promise.all([
    execFileAsync(resolvedPath, ["--version"], { timeout: 5_000 }),
    readFile(resolvedPath),
  ]);
  if (stdout.trim() !== `codex-cli ${CODEX_VERSION}`) {
    throw new Error(`Unsupported Codex binary version: ${stdout.trim()}`);
  }
  const digest = createHash("sha256").update(bytes).digest("hex");
  const expected = typeof expectedSha256 === "string" ? [expectedSha256] : expectedSha256;
  if (!expected.includes(digest)) {
    throw new Error("Codex binary checksum mismatch");
  }
};

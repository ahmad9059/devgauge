import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const MAX_PROFILE_BYTES = 32 * 1024 * 1024;

interface ProfileEntry {
  path: string;
  content: string;
}

interface ProfileArchive {
  version: 1;
  entries: ProfileEntry[];
}

export interface ArchivedProfile {
  bytes: Buffer;
  digest: string;
}

const safeRelativePath = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith("/") &&
  !path.includes("\0") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

/** Archives regular profile files in stable path order; symlinks are rejected. */
export const archiveProfile = async (root: string): Promise<ArchivedProfile> => {
  const entries: ProfileEntry[] = [];
  let totalBytes = 0;

  const walk = async (directory: string): Promise<void> => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const absolute = join(directory, child.name);
      if (child.isSymbolicLink()) throw new Error("Codex profile contains a symbolic link");
      if (child.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!child.isFile()) throw new Error("Codex profile contains an unsupported entry");
      const path = relative(root, absolute).split(sep).join("/");
      if (!safeRelativePath(path)) throw new Error("Codex profile contains an unsafe path");
      const content = await readFile(absolute);
      totalBytes += content.length;
      if (totalBytes > MAX_PROFILE_BYTES) throw new Error("Codex profile exceeds the artifact size limit");
      entries.push({ path, content: content.toString("base64") });
    }
  };

  await walk(root);
  const bytes = Buffer.from(JSON.stringify({ version: 1, entries } satisfies ProfileArchive), "utf8");
  return { bytes, digest: createHash("sha256").update(bytes).digest("hex") };
};

/** Restores only regular files beneath a newly-created profile root. */
export const restoreProfile = async (root: string, artifact: ArchivedProfile): Promise<void> => {
  const digest = createHash("sha256").update(artifact.bytes).digest("hex");
  if (digest !== artifact.digest) throw new Error("Codex profile artifact digest mismatch");
  if (artifact.bytes.length > MAX_PROFILE_BYTES * 2) throw new Error("Codex profile artifact is too large");

  const parsed = JSON.parse(artifact.bytes.toString("utf8")) as Partial<ProfileArchive>;
  if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error("Unsupported Codex profile artifact");
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  let totalBytes = 0;
  for (const entry of parsed.entries) {
    if (!entry || typeof entry.path !== "string" || typeof entry.content !== "string" || !safeRelativePath(entry.path)) {
      throw new Error("Codex profile artifact contains an invalid entry");
    }
    const absolute = resolve(root, entry.path);
    if (!absolute.startsWith(`${resolve(root)}${sep}`)) throw new Error("Codex profile artifact escaped its root");
    const content = Buffer.from(entry.content, "base64");
    totalBytes += content.length;
    if (totalBytes > MAX_PROFILE_BYTES) throw new Error("Codex profile exceeds the artifact size limit");
    await mkdir(dirname(absolute), { recursive: true, mode: 0o700 });
    await writeFile(absolute, content, { mode: 0o600 });
  }
};

export const removePlaintextProfile = async (root: string): Promise<void> => {
  const details = await stat(root).catch(() => null);
  if (details) await rm(root, { recursive: true, force: true, maxRetries: 3 });
};

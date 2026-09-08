import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { archiveProfile, removePlaintextProfile, restoreProfile } from "./profile-artifact.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removePlaintextProfile(root)));
});

describe("Codex profile artifacts", () => {
  it("archives deterministically and restores with restrictive permissions", async () => {
    const source = await mkdtemp(join(tmpdir(), "codex-profile-source-"));
    const target = await mkdtemp(join(tmpdir(), "codex-profile-target-"));
    roots.push(source, target);
    await mkdir(join(source, "nested"), { mode: 0o700 });
    await writeFile(join(source, "auth.json"), "secret", { mode: 0o600 });
    await writeFile(join(source, "nested", "config.toml"), "enabled = true", { mode: 0o600 });

    const first = await archiveProfile(source);
    const second = await archiveProfile(source);
    expect(first).toEqual(second);

    await restoreProfile(target, first);
    expect(await readFile(join(target, "auth.json"), "utf8")).toBe("secret");
    expect((await stat(join(target, "auth.json"))).mode & 0o777).toBe(0o600);
    expect((await stat(target)).mode & 0o777).toBe(0o700);
  });

  it("rejects a modified artifact", async () => {
    const source = await mkdtemp(join(tmpdir(), "codex-profile-source-"));
    const target = await mkdtemp(join(tmpdir(), "codex-profile-target-"));
    roots.push(source, target);
    await writeFile(join(source, "auth.json"), "secret");
    const artifact = await archiveProfile(source);
    artifact.bytes[artifact.bytes.length - 1] ^= 1;
    await expect(restoreProfile(target, artifact)).rejects.toThrow(/digest mismatch/);
  });

  it("removes the plaintext profile", async () => {
    const source = await mkdtemp(join(tmpdir(), "codex-profile-source-"));
    await writeFile(join(source, "auth.json"), "secret");
    await removePlaintextProfile(source);
    await expect(stat(source)).rejects.toThrow();
  });
});

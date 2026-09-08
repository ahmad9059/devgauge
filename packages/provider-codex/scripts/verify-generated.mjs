import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const packageRoot = new URL("..", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("generated/manifest.json", packageRoot), "utf8"));
const root = mkdtempSync(join(tmpdir(), "devgauge-codex-schema-"));

try {
  const version = execFileSync("codex", ["--version"], { encoding: "utf8" }).trim();
  if (version !== `codex-cli ${manifest.codexVersion}`) throw new Error(`Expected codex-cli ${manifest.codexVersion}; received ${version}`);
  execFileSync("codex", ["app-server", "generate-ts", "--out", join(root, "ts")]);
  execFileSync("codex", ["app-server", "generate-json-schema", "--out", join(root, "json")]);

  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(root);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${relative(root, file).replaceAll("\\", "/")}\0`);
    hash.update(readFileSync(file));
  }
  const digest = hash.digest("hex");
  if (files.length !== manifest.generatedFileCount || digest !== manifest.schemaSha256) {
    throw new Error(`Codex generated schema drift: ${files.length} files, sha256 ${digest}`);
  }
  console.log(`Codex schemas verified: ${files.length} files, sha256 ${digest}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}

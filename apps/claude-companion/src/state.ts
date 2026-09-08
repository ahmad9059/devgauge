import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import type { CompanionState } from "./config.js";
import { configDir, emptyState, stateFilePath } from "./config.js";

export const loadState = async (): Promise<CompanionState> => {
  try {
    const raw = await readFile(stateFilePath(), "utf8");
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<CompanionState>) };
  } catch {
    return emptyState();
  }
};

export const saveState = async (state: CompanionState): Promise<void> => {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const tmp = `${stateFilePath()}.tmp`;
  await writeFile(tmp, JSON.stringify(state), { mode: 0o600 });
  await rename(tmp, stateFilePath());
};
#!/usr/bin/env node
import { Command } from "commander";

import {
  doctorCommand,
  ingestCommand,
  installCommand,
  pairCommand,
  statusCommand,
  syncCommand,
  uninstallCommand,
} from "./commands.js";
import type { CommandResult } from "./exit.js";
import { ExitCode } from "./exit.js";

const program = new Command();

program
  .name("devgauge-companion")
  .description("DevGauge companion for Claude Code (minimized statusLine sync).")
  .version("0.1.0")
  .option("--json", "emit structured JSON output");

const emit = (result: CommandResult): void => {
  const json = program.opts().json === true;
  if (json) {
    const { code, message, data } = result;
    console.log(JSON.stringify({ code, message, data }));
  } else {
    console.log(result.message);
  }
  process.exitCode = result.code;
};

const run = async (fn: () => Promise<CommandResult>): Promise<void> => {
  emit(await fn());
};

program
  .command("pair")
  .description("Pair this device with a DevGauge account")
  .option("--code <code>", "single-use pairing code")
  .action((options) => {
    if (!options.code) {
      console.error("pair requires --code <code>");
      process.exitCode = ExitCode.UsageError;
      return;
    }
    void run(() => pairCommand({ code: options.code }));
  });

program
  .command("ingest")
  .description("Read one statusLine JSON document from stdin and sync it")
  .action(() => void run(ingestCommand));

program
  .command("sync")
  .description("Flush the offline queue to the server")
  .action(() => void run(syncCommand));

program
  .command("install")
  .description("Show the Claude Code statusLine configuration to add")
  .action(() => void run(installCommand));

program
  .command("uninstall")
  .description("Remove DevGauge-owned configuration and credentials")
  .action(() => void run(uninstallCommand));

program
  .command("status")
  .description("Report pairing, queue, and version state")
  .action(() => void run(statusCommand));

program
  .command("doctor")
  .description("Check companion health and configuration")
  .action(() => void run(doctorCommand));

void program.parseAsync(process.argv);
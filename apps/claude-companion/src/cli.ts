#!/usr/bin/env node
import { Command } from "commander";

import {
  doctorCommand,
  ingestCommand,
  installCommand,
  pairCommand,
  statusCommand,
  uninstallCommand,
} from "./commands.js";
import { ExitCode } from "./exit.js";

const program = new Command();

program
  .name("devgauge-companion")
  .description("DevGauge companion for Claude Code (minimized statusLine sync).")
  .version("0.1.0")
  .option("--json", "emit structured JSON output");

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
    emit(pairCommand(options));
  });

program.command("ingest").description("Read one statusLine JSON document from stdin (Phase 8)").action(() => {
  emit(ingestCommand());
});

program.command("install").description("Preview and merge the Claude statusLine command (Phase 8)").action(() => {
  emit(installCommand());
});

program.command("uninstall").description("Remove DevGauge-owned Claude configuration (Phase 8)").action(() => {
  emit(uninstallCommand());
});

program.command("status").description("Report pairing, queue, and version state").action(() => {
  emit(statusCommand());
});

program.command("doctor").description("Check companion health and configuration").action(() => {
  emit(doctorCommand());
});

const emit = (result: ReturnType<typeof pairCommand>): void => {
  const json = program.opts().json === true;
  if (json) {
    console.log(JSON.stringify({ ...result, data: result.data }));
  } else {
    console.log(result.message);
  }
  process.exitCode = result.code;
};

void program.parseAsync(process.argv);
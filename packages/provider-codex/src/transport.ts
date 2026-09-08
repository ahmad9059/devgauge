import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

export const MAX_LINE_BYTES = 1024 * 1024;

export class CodexTransportError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "CodexTransportError";
  }
}

export interface CodexDuplex {
  send(line: string): void;
  onLine(cb: (line: string) => void): () => void;
  onClose(cb: () => void): () => void;
  onError(cb: (error: Error) => void): () => void;
  kill(): void;
}

export interface SpawnCodexOptions {
  command?: string;
  args?: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  killGraceMs?: number;
}

/** Bounded JSONL transport for one isolated App Server process. */
export class ProcessDuplex implements CodexDuplex {
  private readonly lineHandlers = new Set<(line: string) => void>();
  private readonly closeHandlers = new Set<() => void>();
  private readonly errorHandlers = new Set<(error: Error) => void>();
  private buffer = Buffer.alloc(0);
  private isClosed = false;
  private killTimer: NodeJS.Timeout | undefined;
  private resolveClosed!: () => void;
  readonly closed = new Promise<void>((resolve) => {
    this.resolveClosed = resolve;
  });

  constructor(
    private readonly child: ChildProcess,
    private readonly killGraceMs = 2_000
  ) {
    if (!child.stdout || !child.stdin) {
      throw new CodexTransportError("Codex process stdio is unavailable");
    }
    child.stdout.on("data", (chunk: Buffer | string) => this.readChunk(Buffer.from(chunk)));
    child.stderr?.resume();
    child.on("error", (error) => this.fail(new CodexTransportError("Codex process failed", error)));
    child.on("close", () => this.finish());
  }

  send(line: string): void {
    if (this.isClosed || !this.child.stdin?.writable) {
      throw new CodexTransportError("Codex transport is closed");
    }
    if (Buffer.byteLength(line, "utf8") > MAX_LINE_BYTES) {
      throw new CodexTransportError("Codex request exceeded the line size limit");
    }
    this.child.stdin.write(`${line}\n`, (error) => {
      if (error) this.fail(new CodexTransportError("Failed to write to Codex", error));
    });
  }

  onLine(cb: (line: string) => void): () => void {
    this.lineHandlers.add(cb);
    return () => this.lineHandlers.delete(cb);
  }

  onClose(cb: () => void): () => void {
    this.closeHandlers.add(cb);
    return () => this.closeHandlers.delete(cb);
  }

  onError(cb: (error: Error) => void): () => void {
    this.errorHandlers.add(cb);
    return () => this.errorHandlers.delete(cb);
  }

  kill(): void {
    if (this.isClosed) return;
    this.signal("SIGTERM");
    this.killTimer = setTimeout(() => this.signal("SIGKILL"), this.killGraceMs);
    this.killTimer.unref();
  }

  private readChunk(chunk: Buffer): void {
    if (this.isClosed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > MAX_LINE_BYTES && !this.buffer.includes(0x0a)) {
      this.fail(new CodexTransportError("Codex response exceeded the line size limit"));
      return;
    }

    let newline = this.buffer.indexOf(0x0a);
    while (newline >= 0) {
      const line = this.buffer.subarray(0, newline);
      this.buffer = this.buffer.subarray(newline + 1);
      if (line.length > MAX_LINE_BYTES) {
        this.fail(new CodexTransportError("Codex response exceeded the line size limit"));
        return;
      }
      const text = line.at(-1) === 0x0d ? line.subarray(0, -1).toString("utf8") : line.toString("utf8");
      for (const handler of this.lineHandlers) handler(text);
      newline = this.buffer.indexOf(0x0a);
    }
  }

  private signal(signal: NodeJS.Signals): void {
    try {
      if (this.child.pid) process.kill(-this.child.pid, signal);
      else this.child.kill(signal);
    } catch {
      // The process already exited.
    }
  }

  private fail(error: Error): void {
    if (this.isClosed) return;
    for (const handler of this.errorHandlers) handler(error);
    this.kill();
  }

  private finish(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    if (this.killTimer) clearTimeout(this.killTimer);
    this.resolveClosed();
    for (const handler of this.closeHandlers) handler();
  }
}

/** Ambient worker secrets are never inherited. Callers must pass an allowlisted environment. */
export const spawnCodex = (options: SpawnCodexOptions): ProcessDuplex => {
  const spawnOptions: SpawnOptions = {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
    detached: true,
  };
  const child = spawn(options.command ?? "codex", options.args ?? ["app-server", "--listen", "stdio://"], spawnOptions);
  return new ProcessDuplex(child, options.killGraceMs);
};

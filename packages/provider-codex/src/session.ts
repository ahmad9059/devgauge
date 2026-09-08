import type { CodexDuplex } from "./transport.js";

export class CodexProtocolError extends Error {
  constructor(message: string, readonly code?: number, readonly cause?: unknown) {
    super(message);
    this.name = "CodexProtocolError";
  }
}

export interface CodexSessionOptions {
  transport: CodexDuplex;
  requestTimeoutMs?: number;
  idleTimeoutMs?: number;
}

interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class CodexSession {
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly notificationHandlers = new Map<string, Set<(params: unknown) => void>>();
  private readonly closeHandlers = new Set<(error: Error) => void>();
  private readonly requestTimeoutMs: number;
  private idleTimer: NodeJS.Timeout | undefined;
  private initializePromise: Promise<unknown> | undefined;
  private initialized = false;
  private closed = false;
  private terminalError: Error | undefined;

  constructor(private readonly options: CodexSessionOptions) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    options.transport.onLine((line) => this.handleLine(line));
    options.transport.onError((error) => this.fail(new CodexProtocolError("Codex transport failed", undefined, error)));
    options.transport.onClose(() => this.fail(new CodexProtocolError("Codex transport closed"), false));
    this.touchIdleTimer();
  }

  get isClosed(): boolean {
    return this.closed;
  }

  initialize(clientInfo: { name: string; title?: string; version?: string }): Promise<unknown> {
    if (this.initializePromise) return this.initializePromise;
    if (this.closed) return Promise.reject(this.terminalError ?? new CodexProtocolError("session closed"));
    this.initializePromise = this.rawRequest("initialize", {
      clientInfo,
      capabilities: { experimentalApi: false },
    }, 0).then((result) => {
      this.send({ method: "initialized", params: {} });
      this.initialized = true;
      return result;
    });
    return this.initializePromise;
  }

  request(method: string, params?: unknown, timeoutMs = this.requestTimeoutMs): Promise<unknown> {
    if (!this.initialized) return Promise.reject(new CodexProtocolError("session not initialized"));
    return this.rawRequest(method, params, this.nextId++, timeoutMs);
  }

  notify(method: string, params?: unknown): void {
    if (!this.initialized) throw new CodexProtocolError("session not initialized");
    this.send(params === undefined ? { method } : { method, params });
  }

  onNotification(method: string, handler: (params: unknown) => void): () => void {
    const handlers = this.notificationHandlers.get(method) ?? new Set();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.notificationHandlers.delete(method);
    };
  }

  onClosed(handler: (error: Error) => void): () => void {
    if (this.closed) {
      queueMicrotask(() => handler(this.terminalError ?? new CodexProtocolError("session closed")));
      return () => undefined;
    }
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  close(): void {
    this.fail(new CodexProtocolError("session closed"));
  }

  private rawRequest(method: string, params: unknown, id: number, timeoutMs = this.requestTimeoutMs): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new CodexProtocolError(`request timed out: ${method}`);
        this.pending.delete(id);
        reject(error);
        this.fail(error);
      }, timeoutMs);
      this.pending.set(id, { method, resolve, reject, timer });
      try {
        this.send(params === undefined ? { method, id } : { method, params, id });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new CodexProtocolError("request failed"));
      }
    });
  }

  private send(message: Record<string, unknown>): void {
    if (this.closed) throw this.terminalError ?? new CodexProtocolError("session closed");
    this.options.transport.send(JSON.stringify(message));
    this.touchIdleTimer();
  }

  private handleLine(raw: string): void {
    if (this.closed) return;
    this.touchIdleTimer();
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      this.fail(new CodexProtocolError("Codex emitted malformed JSON", undefined, error));
      return;
    }
    if (!message || typeof message !== "object") {
      this.fail(new CodexProtocolError("Codex emitted a non-object message"));
      return;
    }

    const input = message as {
      id?: unknown;
      method?: unknown;
      params?: unknown;
      result?: unknown;
      error?: { message?: unknown; code?: unknown };
    };
    if (input.id !== undefined) {
      if (!Number.isInteger(input.id)) {
        this.fail(new CodexProtocolError("Codex emitted a non-integer response id"));
        return;
      }
      const id = input.id as number;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      if (input.error) {
        pending.reject(new CodexProtocolError(
          typeof input.error.message === "string" ? input.error.message : `${pending.method} failed`,
          typeof input.error.code === "number" ? input.error.code : undefined
        ));
      } else {
        pending.resolve(input.result);
      }
      return;
    }

    if (typeof input.method !== "string") {
      this.fail(new CodexProtocolError("Codex emitted an invalid notification"));
      return;
    }
    for (const handler of this.notificationHandlers.get(input.method) ?? []) {
      try {
        handler(input.params);
      } catch {
        // Notification consumers are isolated from the stdout reader.
      }
    }
  }

  private touchIdleTimer(): void {
    if (!this.options.idleTimeoutMs || this.closed) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(
      () => this.fail(new CodexProtocolError("Codex session idle timeout")),
      this.options.idleTimeoutMs
    );
    this.idleTimer.unref();
  }

  private fail(error: Error, kill = true): void {
    if (this.closed) return;
    this.closed = true;
    this.terminalError = error;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    for (const handler of this.closeHandlers) {
      try {
        handler(error);
      } catch {
        // Close observers cannot block process cleanup.
      }
    }
    this.closeHandlers.clear();
    if (kill) this.options.transport.kill();
  }
}

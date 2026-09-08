import type { CodexDuplex } from "../transport.js";

/**
 * An in-memory CodexDuplex for deterministic protocol tests. The test drives
 * it with a responder function: each request line is parsed and a response or
 * notification is emitted.
 */
export class ScriptedDuplex implements CodexDuplex {
  readonly sent: string[] = [];
  private handler: ((line: string) => void) | null = null;
  private closeCb: (() => void) | null = null;
  private errCb: ((err: Error) => void) | null = null;
  private closed = false;

  constructor(private readonly responder?: (req: { method: string; params?: unknown; id?: number }, duplex: ScriptedDuplex) => void) {}

  send(line: string): void {
    if (this.closed) throw new Error("transport closed");
    this.sent.push(line);
    if (this.responder) {
      const msg = JSON.parse(line) as { method: string; params?: unknown; id?: number };
      this.responder(msg, this);
    }
  }

  respond(id: number, result: unknown): void {
    this.handler?.(JSON.stringify({ id, result }));
  }

  respondError(id: number, message: string): void {
    this.handler?.(JSON.stringify({ id, error: { message } }));
  }

  notify(method: string, params: unknown): void {
    this.handler?.(JSON.stringify({ method, params }));
  }

  /** Emits a raw line (to test malformed handling). */
  emitRaw(line: string): void {
    this.handler?.(line);
  }

  onLine(cb: (line: string) => void): () => void {
    this.handler = cb;
    return () => {
      if (this.handler === cb) this.handler = null;
    };
  }

  onClose(cb: () => void): () => void {
    this.closeCb = cb;
    return () => {
      if (this.closeCb === cb) this.closeCb = null;
    };
  }

  onError(cb: (err: Error) => void): () => void {
    this.errCb = cb;
    return () => {
      if (this.errCb === cb) this.errCb = null;
    };
  }

  fail(error: Error): void {
    this.errCb?.(error);
  }

  kill(): void {
    if (!this.closed) {
      this.closed = true;
      this.closeCb?.();
    }
  }
}

export const requestMethod = (line: string): string => (JSON.parse(line) as { method: string }).method;

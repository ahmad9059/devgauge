import { redactValue } from './redaction';

export type LogSink = (line: string) => void;

export type SafeLogger = {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};

/**
 * A logger that redacts before writing. Every structured field passes through
 * the shared redaction rules, so a seeded secret can never reach a log sink.
 */
export function createSafeLogger(sink: LogSink = () => undefined): SafeLogger {
  const write = (
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ) => {
    const record = redactValue('log', {
      level,
      message,
      ...(context ?? {}),
    });
    sink(JSON.stringify(record));
  };
  return {
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}

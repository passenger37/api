import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TraceService } from '../tracing/trace.service';

export interface OperationLogInput {
  /** Short subsystem name, e.g. 'jobs', 'media', 'auth', 'http'. */
  module: string;
  /** Business operation name, e.g. 'enqueue', 'worker.process'. */
  operation: string;
  /** Request or correlation id. */
  reqId?: string;
  /** Authenticated user id where appropriate. */
  userId?: string;
  /** Associated entity id (e.g. jobId, queueName). */
  entityId?: string;
  /** Operation duration in milliseconds. */
  durationMs?: number;
  /** Stable machine-readable error code (e.g. HTTP status or custom). */
  errorCode?: string | number;
  /** Optional additional structured context. */
  details?: Record<string, unknown>;
  /** Human-readable message. */
  message?: string;
}

/**
 * Injectable structured logger built on top of the nestjs-pino `PinoLogger`
 * already wired into the app. Emits every operation as top-level structured
 * pino fields (`module`, `operation`, `reqId`, `userId`, `durationMs`,
 * `errorCode`), which are queryable in production log stores.
 */
@Injectable()
export class StructuredLogger {
  constructor(
    private readonly pino: PinoLogger,
    private readonly traceService: TraceService,
  ) {}

  info(input: OperationLogInput): void {
    this.pino.info(this.toObject(input));
  }

  debug(input: OperationLogInput): void {
    this.pino.debug(this.toObject(input));
  }

  warn(input: OperationLogInput): void {
    this.pino.warn(this.toObject(input));
  }

  error(input: OperationLogInput): void {
    this.pino.error(this.toObject(input));
  }

  private toObject(input: OperationLogInput): Record<string, unknown> {
    const trace = this.traceService.getContext();
    return {
      msg: input.message ?? 'operation',
      module: input.module,
      operation: input.operation,
      ...(input.reqId ? { reqId: input.reqId } : {}),
      ...(trace?.traceId ? { traceId: trace.traceId } : {}),
      ...(trace?.parentId ? { parentId: trace.parentId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
      ...(input.durationMs !== undefined
        ? { durationMs: input.durationMs }
        : {}),
      ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
      ...(input.details ?? {}),
    };
  }
}

/** Time an async operation and report its duration via the provided logger. */
export async function withDuration<T>(
  logger: StructuredLogger,
  input: OperationLogInput,
  fn: () => Promise<T>,
  onSettled: (durationMs: number) => void,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    onSettled(Date.now() - start);
    return result;
  } catch (error) {
    onSettled(Date.now() - start);
    throw error;
  }
}

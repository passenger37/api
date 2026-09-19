import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface TraceContext {
  /** Shared, stable id propagated across request -> outbox -> queue/worker. */
  traceId: string;
  /** Optional parent span id for breadcrumb correlation. */
  parentId?: string;
}

/**
 * Per-request / per-async-relative trace context backed by AsyncLocalStorage,
 * so the active `traceId` is available anywhere down the async call chain
 * without threading it through every signature. Used at the request boundary
 * (middleware), the outbox publisher, and BullMQ workers.
 */
@Injectable()
export class TraceService {
  private readonly storage = new AsyncLocalStorage<TraceContext>();

  getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }

  getContext(): TraceContext | undefined {
    return this.storage.getStore();
  }

  /** Run `fn` inside the given trace context (inherited by async descendants). */
  run<TReturn>(context: TraceContext, fn: () => TReturn): TReturn {
    return this.storage.run(context, fn);
  }

  /** Run `fn` under the current trace id (or a fresh one if none is active). */
  runCurrent<TReturn>(fn: () => TReturn): TReturn {
    const current = this.getContext();
    return this.storage.run(
      {
        traceId: current?.traceId ?? randomUUID(),
        parentId: current?.parentId,
      },
      fn,
    );
  }
}

export { randomUUID };

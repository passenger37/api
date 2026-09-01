import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { TraceService } from './trace.service';

export const TRACE_ID_HEADER = 'x-trace-id';

/**
 * Establishes the per-request trace context. A trace id is derived from the
 * inbound `x-trace-id` header (for cross-service propagation) or generated,
 * then everything downstream runs inside the matching AsyncLocalStorage
 * context so `TraceService.getTraceId()` is available for the whole request.
 */
@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly traceService: TraceService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const headerTraceId = req.headers[TRACE_ID_HEADER];
    const traceId =
      (Array.isArray(headerTraceId) ? headerTraceId[0] : headerTraceId) ||
      (req as Request & { traceId?: string }).traceId ||
      randomUUID();

    (req as Request & { traceId?: string }).traceId = traceId;

    this.traceService.run({ traceId }, () => next());
  }
}

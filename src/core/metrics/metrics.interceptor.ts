import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Records HTTP request metrics: throughput, latency (ms), and error rate,
 * keyed by method + normalized route path. Feeds the same counters/histograms
 * exposed on the `/metrics` endpoint.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { route?: { path?: string } }>();
    const response = http.getResponse<Response>();

    const routePath = request.route?.path || request.path || 'unknown';
    const method = request.method || 'UNKNOWN';

    const start = Date.now();
    response.on('finish', () => {
      const durationMs = Date.now() - start;
      const status = response.statusCode;
      const statusClass = `${Math.floor(status / 100)}xx`;

      this.metrics.increment('http_requests_total', { method, route: routePath, status: String(status) });
      this.metrics.increment('http_requests_by_status_class', { method, statusClass });
      this.metrics.observeDuration('http_request_duration_ms', durationMs, { method, route: routePath });
      if (status >= 500) {
        this.metrics.increment('http_errors_total', { method, route: routePath, status: String(status) });
      }
    });

    return next.handle().pipe(tap(() => undefined));
  }
}

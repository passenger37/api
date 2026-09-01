import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { ApiVersionControlService } from './api-version-control.service';

/**
 * Lecture 40.84 - API Versioning / Evolution.
 *
 * Advertises the evolution path on the wire: for any HTTP request served under
 * a deprecated version (e.g. `/v1/...`) it attaches `Deprecation`, `Sunset`
 * and `Link` headers so legacy clients are signalled to migrate. Current
 * versions (e.g. `/v2/...`) are left header-free.
 */
@Injectable()
export class DeprecationHeaderInterceptor implements NestInterceptor {
  private static readonly URI_VERSION =
    /^\/(?:api\/)?v(\d+)(?:\/|$)/;

  constructor(private readonly versions: ApiVersionControlService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const version = this.resolveVersion(request.url);
    if (version === undefined) {
      return next.handle();
    }

    for (const [name, value] of Object.entries(
      this.versions.buildDeprecationHeaders(version),
    )) {
      response.setHeader(name, value);
    }
    return next.handle();
  }

  private resolveVersion(url: string): number | undefined {
    const match = url.match(DeprecationHeaderInterceptor.URI_VERSION);
    if (!match) {
      return undefined;
    }
    const major = Number.parseInt(match[1], 10);
    return this.versions.hasVersion(major) ? major : undefined;
  }
}

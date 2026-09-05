import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { HttpRateLimitService, RateLimitInfo } from '../services/http-rate-limit.service';

@Injectable()
export class HttpRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: HttpRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id ?? 'anonymous';
    const ip = request.ip ?? 'unknown';
    const path = request.route?.path ?? request.path;
    const method = request.method;

    const key = `http:${method}:${path}:${userId}:${ip}`;
    const limit = this.getLimitForPath(path, method);
    const windowSeconds = 60;

    try {
      const info = await this.rateLimitService.consume({
        key,
        limit,
        windowSeconds,
      });

      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', info.limit);
      response.setHeader('X-RateLimit-Remaining', info.remaining);
      response.setHeader('X-RateLimit-Reset', info.resetAt);

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        const errorResponse = error.getResponse() as { limit?: number; resetAt?: number } | string;
        const response = context.switchToHttp().getResponse();
        const errLimit = typeof errorResponse === 'object' && errorResponse !== null ? errorResponse.limit : limit;
        const errResetAt = (typeof errorResponse === 'object' && errorResponse !== null && errorResponse.resetAt) ? errorResponse.resetAt : Math.floor(Date.now() / 1000) + 60;
        
        response.setHeader('X-RateLimit-Limit', errLimit);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader('X-RateLimit-Reset', errResetAt);
        response.setHeader('Retry-After', Math.ceil(errResetAt - Date.now() / 1000));
      }
      throw error;
    }
  }

  private getLimitForPath(path: string, method: string): number {
    if (path.startsWith('/auth/')) {
      return 10;
    }

    if (path.startsWith('/admin/')) {
      return 100;
    }

    if (path.startsWith('/websocket') || path.startsWith('/calling')) {
      return 100;
    }

    return 1000;
  }
}
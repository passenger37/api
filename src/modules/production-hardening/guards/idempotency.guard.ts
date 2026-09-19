import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IdempotencyService } from '../services/idempotency.service';
import { Reflector } from '@nestjs/core';

export const IDEMPOTENCY_KEY = 'idempotency';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireIdempotency = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENCY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireIdempotency) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      throw new HttpException(
        'Idempotency-Key header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const userId = request.user?.id ?? 'anonymous';
    const key = `idempotency:${request.method}:${request.route?.path ?? request.path}:${userId}:${idempotencyKey}`;

    const result = await this.idempotencyService.checkAndMark({
      key,
      ttlSeconds: 3600,
    });

    if (!result.isFirstRequest) {
      throw new HttpException(
        {
          message: 'Duplicate request detected',
          existingResult: result.existingResult,
        },
        HttpStatus.CONFLICT,
      );
    }

    request.idempotencyKey = key;
    request.idempotencyResult = result;

    return true;
  }
}

export function RequireIdempotency() {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(IDEMPOTENCY_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(IDEMPOTENCY_KEY, true, target);
    }
    return descriptor ?? target;
  };
}

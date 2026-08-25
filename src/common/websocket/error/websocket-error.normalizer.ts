import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { WebSocketErrorCode } from './websocket-error-code.enum';
import {
  WebSocketErrorPayload,
  WebSocketErrorResponse,
} from './websocket-error.types';
import { WebSocketException } from './websocket.exception';

@Injectable()
export class WebSocketErrorNormalizer {
  normalize(exception: unknown, event: string): WebSocketErrorResponse {
    const error = this.normalizeError(exception);

    return {
      success: false,
      event,
      error,
    };
  }

  private normalizeError(exception: unknown): WebSocketErrorPayload {
    if (exception instanceof WebSocketException) {
      return {
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof BadRequestException) {
      return {
        code: WebSocketErrorCode.INVALID_PAYLOAD,
        message: exception.message,
      };
    }

    if (exception instanceof UnauthorizedException) {
      return {
        code: WebSocketErrorCode.UNAUTHORIZED,
        message: exception.message,
      };
    }

    if (exception instanceof ForbiddenException) {
      return {
        code: WebSocketErrorCode.FORBIDDEN,
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      return {
        code: WebSocketErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
      };
    }

    return {
      code: WebSocketErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    };
  }
}

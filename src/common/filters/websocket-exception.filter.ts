import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

import { WsException } from '@nestjs/websockets';

import { Socket } from 'socket.io';

import { NexusErrorCode } from '../error/nexus-error-code';

import { NexusWebSocketErrorResponse } from '../error/nexus-error-response';

@Catch()
export class WebSocketExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WebSocketExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const event = host.switchToWs().getPattern();

    const error = this.normalizeException(exception);

    const response: NexusWebSocketErrorResponse = {
      success: false,

      event: typeof event === 'string' ? event : 'unknown',

      error,
    };

    this.logger.warn(
      `WebSocket error | socket=${client.id} | event=${response.event} | code=${error.code}`,
    );

    client.emit('error', response);
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof WsException) {
      const error = exception.getError();

      if (typeof error === 'string') {
        return {
          code: NexusErrorCode.INVALID_REQUEST,

          message: error,
        };
      }

      if (typeof error === 'object' && error !== null) {
        const data = error as Record<string, unknown>;

        return {
          code:
            typeof data.code === 'string'
              ? (data.code as NexusErrorCode)
              : NexusErrorCode.INVALID_REQUEST,

          message:
            typeof data.message === 'string'
              ? data.message
              : 'WebSocket request failed.',
        };
      }
    }

    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    this.logger.error(
      'Unhandled WebSocket exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      code: NexusErrorCode.INTERNAL_ERROR,

      message: 'Something went wrong.',
    };
  }

  private normalizeHttpException(exception: HttpException) {
    const status = exception.getStatus();

    const response = exception.getResponse();

    let message = 'Request failed.';

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const data = response as Record<string, unknown>;

      if (typeof data.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      }
    }

    switch (status) {
      case 401:
        return {
          code: NexusErrorCode.UNAUTHORIZED,
          message,
        };

      case 403:
        return {
          code: NexusErrorCode.FORBIDDEN,
          message,
        };

      case 404:
        return {
          code: NexusErrorCode.NOT_FOUND,
          message,
        };

      case 400:
        return {
          code: NexusErrorCode.INVALID_REQUEST,
          message,
        };

      default:
        return {
          code: NexusErrorCode.INTERNAL_ERROR,
          message: status >= 500 ? 'Something went wrong.' : message,
        };
    }
  }
}

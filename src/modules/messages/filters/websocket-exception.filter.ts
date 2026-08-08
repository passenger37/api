import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

import { WsException } from '@nestjs/websockets';

import { Socket } from 'socket.io';

@Catch()
export class WebSocketExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const error = this.normalizeException(exception);

    client.emit('message-error', error);
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof WsException) {
      const error = exception.getError();

      if (typeof error === 'string') {
        return {
          code: 'WEBSOCKET_ERROR',
          message: error,
        };
      }

      if (typeof error === 'object' && error !== null) {
        return {
          code: 'WEBSOCKET_ERROR',
          ...error,
        };
      }
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          code: exception.name,
          message: response,
        };
      }

      if (typeof response === 'object' && response !== null) {
        const responseObject = response as {
          message?: string | string[];
        };

        return {
          code: exception.name,
          message: responseObject.message,
        };
      }
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    };
  }
}

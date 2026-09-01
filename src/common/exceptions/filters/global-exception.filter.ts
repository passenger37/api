import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Request, Response } from 'express';

import { StructuredLogger } from '../../../core/logger/structured-logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly structuredLogger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();

    const request = ctx.getRequest<Request & { user?: { id?: string }; id?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal Server Error';
    let errors: unknown = null;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const res = exceptionResponse as Record<string, any>;
      message = res.message ?? message;
      errors = res.message;
    }

    if (!(exception instanceof HttpException)) {
      this.structuredLogger.error({
        module: 'global-exception',
        operation: 'unhandled-exception',
        reqId: request.id,
        userId: request.user?.id,
        errorCode: status,
        message: `Unhandled exception on ${request.method} ${request.url}`,
        details: {
          method: request.method,
          path: request.url,
          statusCode: status,
          stack:
            exception instanceof Error ? exception.stack : String(exception),
        },
      });
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

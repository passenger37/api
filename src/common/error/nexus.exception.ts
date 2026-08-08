import { HttpException } from '@nestjs/common';

import { NexusErrorCode } from './nexus-error-code';

export class NexusException extends HttpException {
  constructor(
    code: NexusErrorCode,
    message: string,
    status = 400,
    details?: unknown,
  ) {
    super(
      {
        code,
        message,
        details,
      },
      status,
    );
  }
}

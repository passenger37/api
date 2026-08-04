import { Injectable, BadRequestException } from '@nestjs/common';

import { CreateServerRequest } from '../dto/request/create-server.request';

@Injectable()
export class ServerValidationService {
  async validateCreateServer(
    ownerId: string,
    request: CreateServerRequest,
  ): Promise<void> {
    if (!ownerId) {
      throw new BadRequestException('Owner is required.');
    }

    if (!request.name?.trim()) {
      throw new BadRequestException(
        'Server name is required.',
      );
    }
  }
}
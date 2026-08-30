import { Injectable, BadRequestException } from '@nestjs/common';

import { CreateServerRequest } from '../dto/request/create-server.request';
import { UpdateServerRequest } from '../dto/request/update-server.request';

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
      throw new BadRequestException('Server name is required.');
    }
  }

  async validateUpdateServer(request: UpdateServerRequest): Promise<void> {
    if (
      request.name !== undefined &&
      (request.name.trim().length < 3 || request.name.trim().length > 100)
    ) {
      throw new BadRequestException(
        'Server name must be between 3 and 100 characters.',
      );
    }

    if (request.description !== undefined && request.description.length > 500) {
      throw new BadRequestException(
        'Server description must be 500 characters or fewer.',
      );
    }
  }
}

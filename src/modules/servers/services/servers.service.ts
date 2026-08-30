import { Injectable } from '@nestjs/common';

import { CreateServerRequest } from '../dto/request/create-server.request';
import { UpdateServerRequest } from '../dto/request/update-server.request';

import { ServerCommandService } from './server-command.service';

@Injectable()
export class ServersService {
  constructor(private readonly commandService: ServerCommandService) {}

  async createServer(ownerId: string, request: CreateServerRequest) {
    return this.commandService.createServer(ownerId, request);
  }

  async updateServer(
    serverId: string,
    userId: string,
    request: UpdateServerRequest,
  ) {
    return this.commandService.updateServer(serverId, userId, request);
  }

  async deleteServer(serverId: string, userId: string) {
    return this.commandService.deleteServer(serverId, userId);
  }
}

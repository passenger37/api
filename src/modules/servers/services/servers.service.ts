import { Injectable } from '@nestjs/common';

import { CreateServerRequest } from '../dto/request/create-server.request';

import { ServerCommandService } from './server-command.service';

@Injectable()
export class ServersService {
  constructor(private readonly commandService: ServerCommandService) {}

  async createServer(ownerId: string, request: CreateServerRequest) {
    return this.commandService.createServer(ownerId, request);
  }
}

import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { CreateServerRequest } from '../dto/request/create-server.request';

import { ServersService } from '../services/servers.service';

@Controller('servers')
export class ServersController {
  constructor(
    private readonly serversService: ServersService,
  ) {}

  @Post()
  async createServer(
    @CurrentUser()
    user: JwtPayload,

    @Body()
    request: CreateServerRequest,
  ) {
    return this.serversService.createServer(
      user.sub,
      request,
    );
  }
}
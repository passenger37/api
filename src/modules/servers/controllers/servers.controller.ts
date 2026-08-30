import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';

import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

import { CreateServerRequest } from '../dto/request/create-server.request';
import { UpdateServerRequest } from '../dto/request/update-server.request';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';
import { ServerPermissionGuard } from '../gaurds/server-permission.guard';

import { ServersService } from '../services/servers.service';
import { ServerQueryService } from '../services/server-query.service';
import { ServerJoinService } from '../services/server-join.service';
import { ServerMemberRepository } from '../repositories/server-member.repository';

@Controller('servers')
export class ServersController {
  constructor(
    private readonly serversService: ServersService,
    private readonly serverQueryService: ServerQueryService,
    private readonly serverJoinService: ServerJoinService,
    private readonly memberRepository: ServerMemberRepository,
  ) {}

  @Post()
  async createServer(
    @CurrentUser()
    user: JwtPayload,

    @Body()
    request: CreateServerRequest,
  ) {
    return this.serversService.createServer(user.sub, request);
  }

  /**
   * GET
   * /servers
   * Public directory of servers shown on the landing page.
   */
  @Get()
  @Public()
  async getPublicDirectory() {
    return this.serverQueryService.getPublicDirectory();
  }

  /**
   * GET
   * /servers/me
   * Servers the current user owns or has joined.
   */
  @Get('me')
  async getMyServers(@CurrentUser() user: JwtPayload) {
    return this.memberRepository.findServersByUser(user.sub);
  }

  /**
   * GET
   * /servers/:serverId/preview
   * Public server preview (name, description, member count) so non-members
   * can decide whether to join.
   */
  @Get(':serverId/preview')
  @Public()
  async getServerPreview(@Param('serverId') serverId: string) {
    return this.serverQueryService.getPublicPreview(serverId);
  }

  /**
   * POST
   * /servers/:serverId/join
   * Joins a public server directly.
   */
  @Post(':serverId/join')
  async joinServer(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.serverJoinService.joinPublic(serverId, userId);
  }

  /**
   * GET
   * /servers/:serverId
   */
  @Get(':serverId')
  @UseGuards(ServerPermissionGuard)
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async getServer(@Param('serverId') serverId: string) {
    return this.serverQueryService.getByIdOrThrow(serverId);
  }

  /**
   * PATCH
   * /servers/:serverId
   * Updates the server's display settings (requires SERVER_UPDATE).
   */
  @Patch(':serverId')
  @UseGuards(ServerPermissionGuard)
  @RequireServerPermission(ServerPermission.SERVER_UPDATE)
  async updateServer(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
    @Body() request: UpdateServerRequest,
  ) {
    return this.serversService.updateServer(serverId, userId, request);
  }

  /**
   * DELETE
   * /servers/:serverId
   * Permanently deletes a server and everything in it (owner only).
   */
  @Delete(':serverId')
  @UseGuards(ServerPermissionGuard)
  @RequireServerPermission(ServerPermission.SERVER_DELETE)
  async deleteServer(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.serversService.deleteServer(serverId, userId);
  }

  /**
   * POST
   * /servers/:serverId/leave
   * Removes the current user's membership from the server.
   */
  @Post(':serverId/leave')
  async leaveServer(
    @Param('serverId') serverId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.serverJoinService.leaveServer(serverId, userId);
  }
}

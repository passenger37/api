import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';

import { ServerPermission } from '@prisma/client';

import { ServerRoleCommandService } from '../services/server-role-command.service';

import { CreateServerRoleRequest } from '../dto/request/create-server-role.request';

@ApiTags('Server Roles')
@ApiBearerAuth()
@Controller('servers/:serverId/roles')
@UseGuards(JwtAuthGuard)
export class ServerRoleController {
  constructor(private readonly roleCommandService: ServerRoleCommandService) {}

  @Post()
  @ApiOperation({
    summary: 'Create server role',
  })
  @RequireServerPermission(ServerPermission.ROLE_CREATE)
  async createRole(
    @Param('serverId')
    serverId: string,

    @CurrentUser()
    user: any,

    @Body()
    request: CreateServerRoleRequest,
  ) {
    return this.roleCommandService.createRole(serverId, user.id, request);
  }
}

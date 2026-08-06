import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { RequireServerPermission } from '../decorators/require-server-permission.decorator';
import { ServerPermission } from '@prisma/client';
import { ServerPermissionGuard } from '../gaurds/server-permission.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ReplaceRolePermissionsRequest } from '../dto/request/replace-role-permissions.request';
import { ServerRolePermissionCommandService } from '../services/server-role-permission-command.service';

@UseGuards(JwtAuthGuard, ServerPermissionGuard)
@Controller('servers/:serverId/roles')
@UseGuards(JwtAuthGuard)
export class ServerRolePermissionController {
  constructor(
    private readonly commandService: ServerRolePermissionCommandService,
  ) {}

  @Patch(':roleId/permissions')
  @RequireServerPermission(ServerPermission.ROLE_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async replacePermissions(
    @Param('serverId') serverId: string,

    @Param('roleId') roleId: string,

    @CurrentUser('id') userId: string,

    @Body()
    request: ReplaceRolePermissionsRequest,
  ) {
    await this.commandService.replacePermissions(
      serverId,
      roleId,
      userId,
      request,
    );
  }
}

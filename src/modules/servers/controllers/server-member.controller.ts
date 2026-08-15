import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

import { RequireServerPermission } from '../decorators/require-server-permission.decorator';

import { ServerRoleAssignmentCommandService } from '../services/server-role-assignment-command.service';
import { ServerRoleAssignmentQueryService } from '../services/server-role-assignment-query.service';
import { ServerMemberQueryService } from '../services/server-member-query.service';
import { GetServerMembersRequest } from '../dto/request/get-server-members.request';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('servers/:serverId/members')
export class ServerMemberController {
  constructor(
    private readonly roleAssignmentCommandService: ServerRoleAssignmentCommandService,
    private readonly roleAssignmentQueryService: ServerRoleAssignmentQueryService,
    private readonly memberQueryService: ServerMemberQueryService,
  ) {}

  /**
   * GET
   * /servers/:serverId/members
   */
  @Get()
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async getMembers(
    @Param('serverId') serverId: string,
    @Query() request: GetServerMembersRequest,
  ) {
    return this.memberQueryService.getMembers(serverId, request);
  }

  /**
   * GET
   * /servers/:serverId/members/:memberId/roles
   */
  @Get(':memberId/roles')
  @RequireServerPermission(ServerPermission.SERVER_VIEW)
  async getMemberRoles(@Param('memberId') memberId: string) {
    return this.roleAssignmentQueryService.getMemberRoles(memberId);
  }

  /**
   * POST
   * /servers/:serverId/members/:memberId/roles/:roleId
   */
  @Post(':memberId/roles/:roleId')
  @RequireServerPermission(ServerPermission.ROLE_ASSIGN)
  async assignRole(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.roleAssignmentCommandService.assignRole(
      serverId,
      memberId,
      roleId,
      userId,
    );
  }

  /**
   * DELETE
   * /servers/:serverId/members/:memberId/roles/:roleId
   */
  @Delete(':memberId/roles/:roleId')
  @RequireServerPermission(ServerPermission.ROLE_ASSIGN)
  async removeRole(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.roleAssignmentCommandService.removeRole(
      serverId,
      memberId,
      roleId,
      userId,
    );
  }
}

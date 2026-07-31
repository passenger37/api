import { Injectable } from '@nestjs/common';

import { UserRoleQueryService } from './user-role-query.service';
import { UserRoleCommandService } from './user-role-command.service';

@Injectable()
export class UserRolesService {
  constructor(
    private readonly query: UserRoleQueryService,
    private readonly command: UserRoleCommandService,
  ) {}

  // =====================================================
  // Query
  // =====================================================

  findById(id: string) {
    return this.query.findById(id);
  }

  getRolesByUser(userId: string) {
    return this.query.getRolesByUser(userId);
  }

  getUsersByRole(roleId: string) {
    return this.query.getUsersByRole(roleId);
  }

  // =====================================================
  // Command
  // =====================================================

  assign(userId: string, roleId: string) {
    return this.command.assign(userId, roleId);
  }

  assignMany(userId: string, roleIds: string[]) {
    return this.command.assignMany(userId, roleIds);
  }

  remove(userId: string, roleId: string) {
    return this.command.remove(userId, roleId);
  }

  replace(userId: string, roleIds: string[]) {
    return this.command.replace(userId, roleIds);
  }
}

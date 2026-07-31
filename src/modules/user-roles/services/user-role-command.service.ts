import { Injectable } from '@nestjs/common';

import { UserRoleDomainService } from './user-role-domain.service';
import { UserRoleValidationService } from './user-role-validation.service';

@Injectable()
export class UserRoleCommandService {
  constructor(
    private readonly validation: UserRoleValidationService,
    private readonly domain: UserRoleDomainService,
  ) {}

  async assign(userId: string, roleId: string) {
    await this.validation.validateAssignmentDoesNotExist(userId, roleId);

    return this.domain.assign(userId, roleId);
  }

  async assignMany(userId: string, roleIds: string[]) {
    await this.validation.validateAssignments(userId, roleIds);

    return this.domain.assignMany(userId, roleIds);
  }

  async remove(userId: string, roleId: string) {
    await this.validation.validateAssignmentExists(userId, roleId);

    return this.domain.remove(userId, roleId);
  }

  async replace(userId: string, roleIds: string[]) {
    await this.validation.validateAssignments(userId, roleIds);

    await this.domain.removeAll(userId);

    return this.domain.assignMany(userId, roleIds);
  }
}

import { Injectable } from '@nestjs/common';

import {
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  RemovePermissionFromRoleDto,
  ReplaceRolePermissionsDto,
} from '../dto';

import { RolePermissionMapper } from '../mappers';
import { RolePermissionDomainService } from './role-permission-domain.service';
import { RolePermissionValidationService } from './role-permission-validation.service';

@Injectable()
export class RolePermissionCommandService {
  constructor(
    private readonly validationService: RolePermissionValidationService,
    private readonly domainService: RolePermissionDomainService,
  ) {}

  /**
   * Assign one permission
   */
  async assign(dto: AssignPermissionToRoleDto) {
    await this.validationService.validateAssign(dto.roleId, dto.permissionId);

    const assignment = await this.domainService.assign(dto);

    return RolePermissionMapper.toResponse(assignment);
  }

  /**
   * Remove one permission
   */
  async remove(dto: RemovePermissionFromRoleDto) {
    await this.validationService.validateRemove(dto.roleId, dto.permissionId);

    const assignment = await this.domainService.remove(
      dto.roleId,
      dto.permissionId,
    );

    return RolePermissionMapper.toResponse(assignment);
  }

  /**
   * Assign multiple permissions
   */
  async assignMany(dto: AssignPermissionsToRoleDto): Promise<void> {
    for (const permissionId of dto.permissionIds) {
      await this.validationService.validateAssign(dto.roleId, permissionId);
    }

    await this.domainService.assignMany(dto);
  }

  /**
   * Replace permissions
   */
  async replace(dto: ReplaceRolePermissionsDto): Promise<void> {
    await this.domainService.replace(dto);
  }
}

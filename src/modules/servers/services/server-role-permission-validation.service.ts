import { BadRequestException, Injectable } from '@nestjs/common';

import { ServerPermission } from '@prisma/client';

@Injectable()
export class ServerRolePermissionValidationService {
  validatePermissions(permissions: ServerPermission[]) {
    this.validateDuplicates(permissions);

    this.validateAdministrator(permissions);

    this.validateReservedPermissions(permissions);
  }

  private validateDuplicates(permissions: ServerPermission[]) {
    const unique = new Set(permissions);

    if (unique.size !== permissions.length) {
      throw new BadRequestException('Duplicate permissions are not allowed.');
    }
  }

  private validateAdministrator(permissions: ServerPermission[]) {
    const hasAdministrator = permissions.includes(
      ServerPermission.ADMINISTRATOR,
    );

    if (hasAdministrator && permissions.length > 1) {
      throw new BadRequestException(
        'ADMINISTRATOR should not be combined with additional permissions.',
      );
    }
  }

  private validateReservedPermissions(permissions: ServerPermission[]) {
    // Reserved for future system permissions.
  }
}
